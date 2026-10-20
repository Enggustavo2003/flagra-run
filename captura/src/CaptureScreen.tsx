import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ftpAddresses, ftpAvailable, onFtpFile, onFtpStatus, startFtp, stopFtp } from '../modules/flagra-ftp/src';
import { C, FTP_PORT, FTP_USER, previewUrl } from './config';
import type { EventRow } from './EventsScreen';
import { queue, type Item, type UploadSize } from './queue';
import { Btn, Card, Label, Logo, Stat, s } from './ui';

const KEEP = 'flagra-capture';

export function CaptureScreen(p: { event: EventRow; onBack: () => void }) {
  const items = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  const [size, setSize] = useState<UploadSize>('rapido');
  const [pass, setPass] = useState('');
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState<'aguardando' | 'conectada'>('aguardando');
  const [lastIp, setLastIp] = useState('');
  const [ips, setIps] = useState<string[]>([]);
  const [warn, setWarn] = useState('');
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const inboxRef = useRef('');

  // senha do FTP (4 dígitos, fixa no aparelho) e tamanho escolhido para este evento
  useEffect(() => {
    (async () => {
      let pw = await AsyncStorage.getItem('flagra-capture:ftp-pass');
      if (!pw) {
        pw = String(1000 + Math.floor(Math.random() * 9000));
        await AsyncStorage.setItem('flagra-capture:ftp-pass', pw);
      }
      setPass(pw);
      const sz = await AsyncStorage.getItem(`flagra-capture:size:${p.event.id}`);
      if (sz === 'rapido' || sz === 'original') setSize(sz);
    })();
  }, [p.event.id]);

  // cada foto que a câmera manda entra na fila com o tamanho escolhido naquela hora
  useEffect(() => {
    const a = onFtpFile((f) => queue.add(p.event.id, f.path, f.name, f.size, sizeRef.current));
    const b = onFtpStatus((e) => {
      if (e.kind === 'connected') {
        setCamera('conectada');
        setLastIp(e.message);
      } else if (e.kind === 'disconnected') {
        setCamera('aguardando');
      } else if (e.kind === 'auth_failed') {
        setWarn('A câmera tentou entrar com usuário ou senha errados.');
      }
    });
    queue.start();
    return () => {
      a?.remove();
      b?.remove();
    };
  }, [p.event.id]);

  // desliga ao sair da tela
  useEffect(() => () => {
    stopFtp();
    deactivateKeepAwake(KEEP);
  }, []);

  function chooseSize(v: UploadSize) {
    setSize(v);
    AsyncStorage.setItem(`flagra-capture:size:${p.event.id}`, v).catch(() => {});
  }

  async function toggle() {
    if (on) {
      stopFtp();
      setOn(false);
      setCamera('aguardando');
      deactivateKeepAwake(KEEP);
      return;
    }
    setBusy(true);
    setWarn('');
    try {
      const inbox = await startFtp(FTP_PORT, FTP_USER, pass);
      inboxRef.current = inbox;
      queue.reconcile(inbox, p.event.id, sizeRef.current);
      setIps(ftpAddresses());
      setOn(true);
      await activateKeepAwakeAsync(KEEP);
    } catch (e) {
      Alert.alert('Não ligou', e instanceof Error ? e.message : 'Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  const mine = useMemo(() => items.filter((i) => i.eventId === p.event.id), [items, p.event.id]);
  const count = (st: Item['status']) => mine.filter((i) => i.status === st).length;
  const recent = useMemo(() => [...mine].sort((a, b) => b.addedAt - a.addedAt).slice(0, 8), [mine]);
  const errors = count('erro');

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 48 }]}>
      <View style={s.row}>
        <Logo />
        <Pressable onPress={p.onBack} style={{ marginLeft: 'auto', padding: 8 }}>
          <Text style={{ color: C.dim, fontSize: 15 }}>Trocar evento</Text>
        </Pressable>
      </View>
      <Text style={s.h1} numberOfLines={2}>{p.event.name}</Text>

      {/* status rápido */}
      <View style={s.row}>
        <Chip label="CÂMERA" value={camera === 'conectada' ? 'conectada' : on ? 'aguardando' : '—'} color={camera === 'conectada' ? C.green : C.dim} />
        <Chip label="FTP" value={on ? 'ligado' : 'desligado'} color={on ? C.green : C.dim} />
        <Chip label="ENVIO" value={count('enviando') ? 'subindo' : count('fila') ? 'na fila' : 'em dia'} color={count('enviando') ? C.blue : C.text} />
      </View>

      {/* tamanho no envio */}
      <Card>
        <Label>Tamanho no envio</Label>
        <View style={{ flexDirection: 'row', backgroundColor: C.card2, borderRadius: 14, padding: 4 }}>
          <SizeOpt active={size === 'rapido'} title="Rápido" sub="3000 px" onPress={() => chooseSize('rapido')} />
          <SizeOpt active={size === 'original'} title="Original" sub="arquivo cheio" onPress={() => chooseSize('original')} />
        </View>
        <Text style={[s.p, { fontSize: 13 }]}>O que sobe é o que o comprador recebe. Escolha antes de começar a clicar.</Text>
      </Card>

      {/* FTP */}
      <Card>
        <Label>Câmera por Wi-Fi (FTP)</Label>
        {!ftpAvailable ? (
          <Text style={{ color: C.yellow }}>O FTP só funciona no app Android instalado (APK), não no Expo Go.</Text>
        ) : on ? (
          <>
            <Text style={s.p}>Na câmera, configure o servidor FTP com:</Text>
            <Field k="Servidor" v={ips.filter((a) => !a.startsWith('lo')).map((a) => a.split(' ')[1]).join('  ou  ') || 'ligue o Wi-Fi ou o roteador do celular'} />
            <Field k="Porta" v={String(FTP_PORT)} />
            <Field k="Usuário" v={FTP_USER} />
            <Field k="Senha" v={pass} />
            <Field k="Modo" v="passivo (PASV)" />
            {camera === 'conectada' && <Text style={{ color: C.green, fontSize: 14 }}>Câmera conectada de {lastIp}</Text>}
            <Text style={[s.p, { fontSize: 13 }]}>Deixe o app aberto com a tela ligada. A tela não apaga sozinha enquanto o FTP estiver ligado.</Text>
          </>
        ) : (
          <Text style={s.p}>Ligue o roteador do celular (ou use o mesmo Wi-Fi da câmera) e toque em Ligar.</Text>
        )}
        <Btn title={on ? 'Desligar FTP' : 'Ligar FTP'} kind={on ? 'danger' : 'primary'} onPress={toggle} busy={busy} disabled={!ftpAvailable || !pass} />
        {!!warn && <Text style={{ color: C.red }}>{warn}</Text>}
      </Card>

      {/* números */}
      <View style={s.row}>
        <Stat label="RECEBIDAS" value={mine.length} />
        <Stat label="NA FILA" value={count('fila') + count('enviando')} color={C.yellow} />
        <Stat label="À VENDA" value={count('enviada')} color={C.green} />
        <Stat label="ERROS" value={errors} color={errors ? C.red : C.dim} />
      </View>
      {errors > 0 && <Btn title={`Tentar de novo (${errors})`} kind="ghost" onPress={() => queue.retryErrors()} />}

      {/* últimas */}
      <Card>
        <Label>Últimas fotos</Label>
        {recent.length === 0 && <Text style={s.p}>Assim que a câmera mandar, as fotos aparecem aqui.</Text>}
        {recent.map((i) => (
          <View key={i.id} style={[s.row, { paddingVertical: 4 }]}>
            <Image
              source={{ uri: i.previewPath ? previewUrl(i.previewPath) : i.path.startsWith('file://') ? i.path : `file://${i.path}` }}
              style={{ width: 46, height: 46, borderRadius: 8, backgroundColor: C.card2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[s.mono, { fontSize: 13 }]} numberOfLines={1}>{i.name}</Text>
              <Text style={{ color: C.dim, fontSize: 12 }} numberOfLines={1}>
                {(i.bytes / 1024 / 1024).toFixed(1)} MB · {i.size === 'rapido' ? 'rápido' : 'original'}
                {i.error && i.status !== 'enviada' ? ` · ${i.error}` : ''}
              </Text>
            </View>
            <Text style={{ color: statusColor(i.status), fontSize: 12, fontWeight: '700' }}>{statusText(i.status)}</Text>
          </View>
        ))}
      </Card>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function statusText(st: Item['status']) {
  return st === 'enviada' ? 'À VENDA' : st === 'enviando' ? 'SUBINDO' : st === 'erro' ? 'ERRO' : 'NA FILA';
}
function statusColor(st: Item['status']) {
  return st === 'enviada' ? C.green : st === 'enviando' ? C.blue : st === 'erro' ? C.red : C.yellow;
}

function Chip(p: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 10 }}>
      <Text style={{ color: C.dim, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 }}>{p.label}</Text>
      <Text style={{ color: p.color, fontSize: 15, fontWeight: '700', marginTop: 2 }}>{p.value}</Text>
    </View>
  );
}

function SizeOpt(p: { active: boolean; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={p.onPress} style={{ flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: 'center', backgroundColor: p.active ? C.blue : 'transparent' }}>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{p.title}</Text>
      <Text style={{ color: p.active ? C.text : C.dim, fontSize: 12, fontFamily: 'monospace' }}>{p.sub}</Text>
    </Pressable>
  );
}

function Field(p: { k: string; v: string }) {
  return (
    <View style={[s.row, { justifyContent: 'space-between' }]}>
      <Text style={{ color: C.dim, fontSize: 15 }}>{p.k}</Text>
      <Text selectable style={[s.mono, { fontSize: 17, fontWeight: '700', flexShrink: 1, textAlign: 'right' }]}>{p.v}</Text>
    </View>
  );
}
