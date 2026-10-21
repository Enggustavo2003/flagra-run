package expo.modules.flagraftp;

import java.io.BufferedReader;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Servidor FTP mínimo para receber fotos da câmera (Canon, Sony, Nikon, Fuji).
 * Só recebe: STOR/APPE gravam o arquivo na pasta de entrada; LIST devolve vazio.
 * Modo passivo (PASV/EPSV) e ativo (PORT). Sem TLS (as câmeras usam FTP simples na rede local).
 * Java puro, sem Android, para poder ser testado fora do celular.
 */
public final class FtpServer {

  public interface Listener {
    /** Arquivo terminou de chegar. path = caminho absoluto no aparelho; name = nome original da câmera. */
    void onFile(String path, String name, long size);
    /** Câmera conectou/desconectou ou houve erro. */
    void onStatus(String kind, String message);
  }

  private final int port;
  private final String user;
  private final String pass;
  private final File inbox;
  private final Listener listener;
  private final AtomicInteger clients = new AtomicInteger();
  private final Set<Socket> open = Collections.newSetFromMap(new ConcurrentHashMap<>());
  private volatile ServerSocket server;
  private volatile boolean running;

  public FtpServer(int port, String user, String pass, File inbox, Listener listener) {
    this.port = port;
    this.user = user;
    this.pass = pass;
    this.inbox = inbox;
    this.listener = listener;
  }

  public synchronized void start() throws IOException {
    if (running) return;
    if (!inbox.exists() && !inbox.mkdirs()) throw new IOException("Não deu para criar a pasta " + inbox);
    ServerSocket s = new ServerSocket();
    s.setReuseAddress(true);
    s.bind(new InetSocketAddress(port));
    server = s;
    running = true;
    Thread t = new Thread(this::acceptLoop, "flagra-ftp-accept");
    t.setDaemon(true);
    t.start();
  }

  public synchronized void stop() {
    running = false;
    try { if (server != null) server.close(); } catch (IOException ignored) { }
    for (Socket s : open) { try { s.close(); } catch (IOException ignored) { } }
    open.clear();
    server = null;
  }

  public boolean isRunning() { return running; }
  public int clientCount() { return clients.get(); }

  private void acceptLoop() {
    while (running) {
      try {
        Socket s = server.accept();
        s.setSoTimeout(10 * 60 * 1000);
        open.add(s);
        Thread t = new Thread(() -> session(s), "flagra-ftp-session");
        t.setDaemon(true);
        t.start();
      } catch (IOException e) {
        if (running) listener.onStatus("error", "accept: " + e.getMessage());
      }
    }
  }

  /** IPv4 de cada interface ativa (Wi-Fi e roteador do celular), para mostrar ao fotógrafo. */
  public static List<String> addresses() {
    List<String> out = new ArrayList<>();
    try {
      for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
        if (!ni.isUp() || ni.isLoopback()) continue;
        for (InetAddress a : Collections.list(ni.getInetAddresses())) {
          if (a instanceof Inet4Address) out.add(ni.getName() + " " + a.getHostAddress());
        }
      }
    } catch (SocketException ignored) { }
    return out;
  }

  // ---------------- sessão ----------------

  private static final class Session {
    boolean logged;
    String pendingUser;
    String cwd = "/";
    ServerSocket passive;
    InetSocketAddress active;
    String renameFrom;
    long restart;
    /** nome virtual ("/DCIM/IMG_1.JPG") -> arquivo real recebido nesta sessão */
    final Map<String, File> received = new HashMap<>();
  }

  private void session(Socket ctl) {
    clients.incrementAndGet();
    listener.onStatus("connected", ctl.getInetAddress().getHostAddress());
    Session st = new Session();
    try (BufferedReader in = new BufferedReader(new InputStreamReader(ctl.getInputStream(), StandardCharsets.UTF_8));
         Writer out = new OutputStreamWriter(ctl.getOutputStream(), StandardCharsets.UTF_8)) {
      reply(out, "220 Flagra Capture FTP");
      String line;
      while ((line = in.readLine()) != null) {
        line = line.trim();
        if (line.isEmpty()) continue;
        int sp = line.indexOf(' ');
        String cmd = (sp < 0 ? line : line.substring(0, sp)).toUpperCase(Locale.ROOT);
        String arg = sp < 0 ? "" : line.substring(sp + 1);
        if (!handle(cmd, arg, st, ctl, out)) break;
      }
    } catch (IOException ignored) {
      // câmera caiu ou desligou: segue a vida
    } finally {
      closePassive(st);
      open.remove(ctl);
      try { ctl.close(); } catch (IOException ignored) { }
      clients.decrementAndGet();
      listener.onStatus("disconnected", "");
    }
  }

  /** @return false para encerrar a sessão */
  private boolean handle(String cmd, String arg, Session st, Socket ctl, Writer out) throws IOException {
    switch (cmd) {
      case "USER":
        st.pendingUser = arg;
        st.logged = false;
        reply(out, "331 Senha, por favor");
        return true;
      case "PASS":
        if (user.equals(st.pendingUser) && pass.equals(arg)) {
          st.logged = true;
          reply(out, "230 Conectado");
        } else {
          reply(out, "530 Usuario ou senha errados");
          listener.onStatus("auth_failed", ctl.getInetAddress().getHostAddress());
        }
        return true;
      case "QUIT":
        reply(out, "221 Tchau");
        return false;
      case "AUTH":
        reply(out, "502 Sem TLS");
        return true;
      case "SYST":
        reply(out, "215 UNIX Type: L8");
        return true;
      case "FEAT":
        out.write("211-Recursos:\r\n PASV\r\n EPSV\r\n SIZE\r\n UTF8\r\n REST STREAM\r\n211 Fim\r\n");
        out.flush();
        return true;
      case "NOOP":
        reply(out, "200 OK");
        return true;
      default:
        break;
    }
    if (!st.logged) {
      reply(out, "530 Faca login primeiro");
      return true;
    }
    switch (cmd) {
      case "OPTS":
      case "TYPE":
      case "MODE":
      case "STRU":
      case "CLNT":
        reply(out, "200 OK");
        return true;
      case "ALLO":
        reply(out, "202 OK");
        return true;
      case "PWD":
      case "XPWD":
        reply(out, "257 \"" + st.cwd + "\"");
        return true;
      case "CWD":
      case "XCWD":
        st.cwd = resolve(st.cwd, arg);
        reply(out, "250 OK");
        return true;
      case "CDUP":
      case "XCUP":
        st.cwd = resolve(st.cwd, "..");
        reply(out, "250 OK");
        return true;
      case "MKD":
      case "XMKD":
        reply(out, "257 \"" + resolve(st.cwd, arg) + "\" criada");
        return true;
      case "RMD":
      case "XRMD":
      case "DELE":
        reply(out, "250 OK");
        return true;
      case "SIZE": {
        File f = st.received.get(resolve(st.cwd, arg));
        if (f != null && f.exists()) reply(out, "213 " + f.length());
        else reply(out, "550 Nao existe");
        return true;
      }
      case "REST":
        try {
          st.restart = Long.parseLong(arg.trim());
          reply(out, "350 Retomando em " + st.restart);
        } catch (NumberFormatException e) {
          reply(out, "501 Valor invalido");
        }
        return true;
      case "PASV":
        openPassive(st, ctl);
        InetAddress local = ctl.getLocalAddress();
        String ip = local instanceof Inet4Address ? local.getHostAddress() : "127.0.0.1";
        int p = st.passive.getLocalPort();
        reply(out, "227 Modo passivo (" + ip.replace('.', ',') + "," + (p >> 8) + "," + (p & 255) + ")");
        return true;
      case "EPSV":
        openPassive(st, ctl);
        reply(out, "229 Modo passivo (|||" + st.passive.getLocalPort() + "|)");
        return true;
      case "PORT": {
        String[] n = arg.split(",");
        if (n.length != 6) { reply(out, "501 PORT invalido"); return true; }
        closePassive(st);
        String host = n[0] + "." + n[1] + "." + n[2] + "." + n[3];
        st.active = new InetSocketAddress(host, Integer.parseInt(n[4].trim()) * 256 + Integer.parseInt(n[5].trim()));
        reply(out, "200 PORT OK");
        return true;
      }
      case "LIST":
      case "NLST":
      case "MLSD": {
        Socket data = openData(st, out);
        if (data == null) return true;
        try { data.getOutputStream().flush(); } finally { data.close(); }
        reply(out, "226 Lista vazia");
        return true;
      }
      case "RETR":
        reply(out, "550 Este servidor so recebe fotos");
        return true;
      case "STOR":
      case "APPE":
        store(cmd.equals("APPE"), arg, st, out);
        return true;
      case "RNFR":
        st.renameFrom = resolve(st.cwd, arg);
        reply(out, "350 Pronto para renomear");
        return true;
      case "RNTO": {
        String to = resolve(st.cwd, arg);
        File f = st.renameFrom == null ? null : st.received.remove(st.renameFrom);
        st.renameFrom = null;
        if (f != null) {
          // câmeras que sobem "IMG.TMP" e depois renomeiam: renomeia o arquivo e avisa só agora, com o nome final
          if (isPhoto(to) && !isPhoto(f.getName())) {
            File renamed = new File(inbox, System.currentTimeMillis() + "_" + safe(baseName(to)));
            if (f.renameTo(renamed)) f = renamed;
            st.received.put(to, f);
            notifyFile(f, baseName(to));
          } else {
            st.received.put(to, f);
          }
        }
        reply(out, "250 Renomeado");
        return true;
      }
      default:
        reply(out, "502 Comando nao suportado");
        return true;
    }
  }

  private void store(boolean append, String arg, Session st, Writer out) throws IOException {
    String virtual = resolve(st.cwd, arg);
    String name = baseName(virtual);
    if (name.isEmpty()) { reply(out, "553 Nome invalido"); return; }
    File target = st.received.get(virtual);
    boolean resume = (append || st.restart > 0) && target != null && target.exists();
    if (!resume) target = new File(inbox, System.currentTimeMillis() + "_" + safe(name));
    long restart = st.restart;
    st.restart = 0;
    File part = new File(target.getPath() + ".part");
    if (resume && !target.renameTo(part)) { reply(out, "451 Falha ao retomar"); return; }

    Socket data = openData(st, out);
    if (data == null) return;
    long total = 0;
    boolean ok = false;
    try (InputStream in = data.getInputStream();
         OutputStream fo = new BufferedOutputStream(new FileOutputStream(part, resume && (append || restart > 0)), 256 * 1024)) {
      if (resume && restart > 0 && !append) {
        // REST n: corta o que passou do ponto pedido
        try (java.io.RandomAccessFile raf = new java.io.RandomAccessFile(part, "rw")) { raf.setLength(restart); }
      }
      byte[] buf = new byte[256 * 1024];
      int n;
      while ((n = in.read(buf)) > 0) { fo.write(buf, 0, n); total += n; }
      ok = true;
    } catch (IOException e) {
      listener.onStatus("error", "STOR " + name + ": " + e.getMessage());
    } finally {
      try { data.close(); } catch (IOException ignored) { }
    }
    if (!ok) {
      // guarda o pedaço para um eventual REST/APPE
      part.renameTo(target);
      st.received.put(virtual, target);
      reply(out, "426 Transferencia interrompida");
      return;
    }
    if (!part.renameTo(target)) { reply(out, "451 Falha ao gravar"); return; }
    st.received.put(virtual, target);
    reply(out, "226 Recebido");
    if (isPhoto(name)) {
      notifyFile(target, name);
    } else if (isUnsupported(name)) {
      // RAW e vídeo não vão à venda: apaga na hora para não lotar a memória do celular
      target.delete();
      st.received.remove(virtual);
      listener.onStatus("ignored", name);
    }
  }

  private void notifyFile(File f, String name) {
    listener.onFile(f.getAbsolutePath(), name, f.length());
  }

  private void openPassive(Session st, Socket ctl) throws IOException {
    closePassive(st);
    st.active = null;
    ServerSocket p = new ServerSocket();
    p.setReuseAddress(true);
    p.bind(new InetSocketAddress(ctl.getLocalAddress(), 0));
    p.setSoTimeout(30_000);
    st.passive = p;
  }

  private static void closePassive(Session st) {
    if (st.passive != null) {
      try { st.passive.close(); } catch (IOException ignored) { }
      st.passive = null;
    }
  }

  private Socket openData(Session st, Writer out) throws IOException {
    Socket data;
    try {
      if (st.passive != null) {
        reply(out, "150 Abrindo conexao de dados");
        data = st.passive.accept();
        closePassive(st);
      } else if (st.active != null) {
        reply(out, "150 Abrindo conexao de dados");
        data = new Socket();
        data.connect(st.active, 30_000);
        st.active = null;
      } else {
        reply(out, "425 Use PASV ou PORT antes");
        return null;
      }
    } catch (IOException e) {
      closePassive(st);
      reply(out, "425 Nao abriu a conexao de dados");
      return null;
    }
    data.setSoTimeout(60_000);
    open.add(data);
    return new TrackedSocket(data, open);
  }

  /** Remove o socket da lista de abertos quando fecha. */
  private static final class TrackedSocket extends Socket {
    private final Socket s;
    private final Set<Socket> open;
    TrackedSocket(Socket s, Set<Socket> open) { this.s = s; this.open = open; }
    @Override public InputStream getInputStream() throws IOException { return s.getInputStream(); }
    @Override public OutputStream getOutputStream() throws IOException { return s.getOutputStream(); }
    @Override public synchronized void close() throws IOException { open.remove(s); s.close(); }
  }

  // ---------------- utilidades ----------------

  private static void reply(Writer out, String msg) throws IOException {
    out.write(msg);
    out.write("\r\n");
    out.flush();
  }

  static String resolve(String cwd, String arg) {
    String a = arg == null ? "" : arg.trim();
    String base = a.startsWith("/") ? "" : cwd;
    List<String> parts = new ArrayList<>();
    for (String p : (base + "/" + a).split("/")) {
      if (p.isEmpty() || p.equals(".")) continue;
      if (p.equals("..")) { if (!parts.isEmpty()) parts.remove(parts.size() - 1); continue; }
      parts.add(p);
    }
    return "/" + String.join("/", parts);
  }

  static String baseName(String virtual) {
    int i = virtual.lastIndexOf('/');
    return i < 0 ? virtual : virtual.substring(i + 1);
  }

  static String safe(String name) {
    String s = name.replaceAll("[^A-Za-z0-9._-]", "_");
    return s.length() > 120 ? s.substring(s.length() - 120) : s;
  }

  /** RAW, HEIF e vídeo: a câmera manda, mas não vendemos. Arquivo temporário (.TMP) fica, pode virar JPG no RNTO. */
  static boolean isUnsupported(String name) {
    String n = name.toLowerCase(Locale.ROOT);
    for (String ext : new String[] {".cr2", ".cr3", ".crw", ".nef", ".nrw", ".arw", ".srf", ".sr2", ".raf", ".orf", ".rw2",
        ".pef", ".dng", ".3fr", ".iiq", ".hif", ".heif", ".heic", ".mp4", ".mov", ".avi", ".mts", ".m4v", ".wav", ".xml", ".xmp"}) {
      if (n.endsWith(ext)) return true;
    }
    return false;
  }

  static boolean isPhoto(String name) {
    String n = name.toLowerCase(Locale.ROOT);
    return n.endsWith(".jpg") || n.endsWith(".jpeg");
  }
}
