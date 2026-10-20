"use client";
import { useEffect } from "react";

/**
 * Dificulta copiar as prévias (fotos com marca d'água).
 * - bloqueia clique direito, arrastar e "salvar imagem" nas prévias;
 * - borra as prévias quando a janela perde o foco (ferramenta de recorte, Win+Shift+S, troca de aba);
 * - borra as prévias quando aperta Print Screen ou os atalhos de print do Mac;
 * - esconde as fotos na impressão.
 * Navegador nenhum consegue bloquear print do celular ou foto da tela: a proteção de verdade é a marca d'água.
 */
export function PhotoShield() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const shield = (ms?: number) => {
      root.classList.add("shield");
      if (timer) clearTimeout(timer);
      if (ms) timer = setTimeout(() => root.classList.remove("shield"), ms);
    };
    const unshield = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => root.classList.remove("shield"), 150);
    };
    const isPreview = (t: EventTarget | null) =>
      t instanceof HTMLImageElement && /\/previews\//.test(t.currentSrc || t.src);

    const onContext = (e: MouseEvent) => isPreview(e.target) && e.preventDefault();
    const onDrag = (e: DragEvent) => isPreview(e.target) && e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const macShot = e.metaKey && e.shiftKey && ["3", "4", "5", "#", "$", "%"].includes(e.key);
      const isWin = /Win/i.test(navigator.platform || navigator.userAgent);
      const winSnip = isWin && (e.key === "Meta" || (e.metaKey && e.shiftKey));
      if (e.key === "PrintScreen" || macShot || winSnip) {
        shield(2500);
      }
    };
    const onBlur = () => shield();
    const onVisibility = () => (document.hidden ? shield() : unshield());

    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDrag);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", unshield);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDrag);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", unshield);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
