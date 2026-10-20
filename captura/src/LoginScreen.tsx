import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { C, configOk } from './config';
import { supabase } from './supabase';
import { Btn, Card, Logo, s } from './ui';

/** Entrada por código: o fotógrafo recebe um código de 6 dígitos no e-mail e digita aqui. */
export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function sendCode() {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setMsg('Digite um e-mail válido.');
    setBusy(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email: e });
    setBusy(false);
    if (error) return setMsg('Não deu para mandar o código. Tente de novo em 1 minuto.');
    setStep('code');
  }

  async function verify() {
    const token = code.replace(/\D/g, '');
    if (token.length < 6) return setMsg('Digite o código inteiro que chegou no e-mail.');
    setBusy(true);
    setMsg('');
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' });
    if (error || !data.user) {
      setBusy(false);
      return setMsg('Código errado ou vencido. Peça outro.');
    }
    // mesmo perfil que o site cria na primeira entrada
    await supabase
      .from('photographers')
      .upsert({ id: data.user.id, email: data.user.email ?? '', name: (data.user.email ?? '').split('@')[0] }, { onConflict: 'id', ignoreDuplicates: true });
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={[s.screen, { justifyContent: 'center' }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.pad}>
        <Logo size={28} />
        <Text style={[s.p, { marginBottom: 8 }]}>Clicou, tá à venda. Entre com o mesmo e-mail do painel do Flagra Run.</Text>
        {!configOk && (
          <Card style={{ borderColor: C.red }}>
            <Text style={{ color: C.red }}>App sem configuração do Supabase. Gere o APK com as variáveis EXPO_PUBLIC_*.</Text>
          </Card>
        )}
        {step === 'email' ? (
          <>
            <TextInput
              style={s.input}
              placeholder="seu@email.com"
              placeholderTextColor={C.dim}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={sendCode}
            />
            <Btn title="Receber código" onPress={sendCode} busy={busy} />
          </>
        ) : (
          <>
            <Text style={s.p}>Mandamos um código (6 a 10 números) para {email.trim()}.</Text>
            <TextInput
              style={[s.input, { fontSize: 26, letterSpacing: 8, textAlign: 'center', fontFamily: 'monospace' }]}
              placeholder="000000"
              placeholderTextColor={C.dim}
              keyboardType="number-pad"
              maxLength={10}
              value={code}
              onChangeText={setCode}
              onSubmitEditing={verify}
            />
            <Btn title="Entrar" onPress={verify} busy={busy} />
            <Btn title="Trocar e-mail" kind="ghost" onPress={() => { setStep('email'); setCode(''); setMsg(''); }} />
          </>
        )}
        {!!msg && <Text style={{ color: C.red, fontSize: 15 }}>{msg}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}
