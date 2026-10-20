package expo.modules.flagraftp

import android.content.Context
import android.net.wifi.WifiManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class FtpStartException(message: String) : CodedException(message)

/** Ponte entre o FtpServer (Java puro) e o app. */
class FlagraFtpModule : Module() {
  private var server: FtpServer? = null
  private var wifiLock: WifiManager.WifiLock? = null

  private val context: Context
    get() = appContext.reactContext ?: throw FtpStartException("Contexto do app indisponível")

  override fun definition() = ModuleDefinition {
    Name("FlagraFtp")

    Events("onFile", "onStatus")

    /** Liga o servidor. Devolve a pasta onde as fotos chegam. */
    AsyncFunction("start") { port: Int, user: String, pass: String ->
      server?.stop()
      val inbox = File(context.filesDir, "ftp-inbox")
      val s = FtpServer(port, user, pass, inbox, object : FtpServer.Listener {
        override fun onFile(path: String, name: String, size: Long) {
          sendEvent("onFile", mapOf("path" to path, "name" to name, "size" to size.toDouble()))
        }
        override fun onStatus(kind: String, message: String) {
          sendEvent("onStatus", mapOf("kind" to kind, "message" to message))
        }
      })
      try {
        s.start()
      } catch (e: Exception) {
        throw FtpStartException("Não deu para abrir a porta $port: ${e.message}")
      }
      server = s
      holdWifi(true)
      inbox.absolutePath
    }

    Function("stop") {
      server?.stop()
      server = null
      holdWifi(false)
    }

    Function("isRunning") { server?.isRunning ?: false }

    Function("clients") { server?.clientCount() ?: 0 }

    /** IPv4 de cada rede ativa, ex.: ["wlan0 192.168.0.12", "ap0 192.168.43.1"] */
    Function("addresses") { FtpServer.addresses() }

    OnDestroy {
      server?.stop()
      server = null
      holdWifi(false)
    }
  }

  /** Impede o Android de derrubar o Wi-Fi enquanto a câmera manda fotos. */
  @Suppress("DEPRECATION")
  private fun holdWifi(on: Boolean) {
    try {
      if (on) {
        if (wifiLock == null) {
          val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
          wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "flagra-capture")
        }
        if (wifiLock?.isHeld == false) wifiLock?.acquire()
      } else {
        if (wifiLock?.isHeld == true) wifiLock?.release()
      }
    } catch (_: Exception) {
      // sem trava de Wi-Fi o servidor funciona do mesmo jeito
    }
  }
}
