import { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import { C, SITE_URL } from './config';
import { supabase } from './supabase';
import { checarAtualizacao, type Atualizacao } from './versao';
import { Btn, Logo, s } from './ui';

export type EventRow = { id: string; name: string; city: string; event_date: string; photo_count: number; published: boolean };

export function EventsScreen(p: { userId: string; email: string; onPick: (e: EventRow) => void }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [upd, setUpd] = useState<Atualizacao>({ precisa: false, link: null });

  useEffect(() => {
    checarAtualizacao().then(setUpd);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg('');
    const { data, error } = await supabase
      .from('events')
      .select('id, name, city, event_date, photo_count, published')
      .eq('photographer_id', p.userId)
      .order('event_date', { ascending: false })
      .limit(50);
    setLoading(false);
    if (error) return setMsg('Não deu para carregar seus eventos. Puxe para tentar de novo.');
    setEvents((data ?? []) as EventRow[]);
  }, [p.userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={s.screen}>
      <View style={[s.pad, { paddingTop: 48, paddingBottom: 6 }]}>
        <Logo />
        <Text style={s.h1}>Pra qual evento vão as fotos?</Text>
        <Text style={s.p}>O evento é criado no painel do site. Aqui você só escolhe.</Text>
        {upd.precisa && (
          <Pressable onPress={() => upd.link && Linking.openURL(upd.link)} style={[s.card, { borderColor: C.yellow }]}>
            <Text style={{ color: C.yellow, fontSize: 16, fontWeight: '700' }}>Atualize o app</Text>
            <Text style={s.p}>Esta versão ficou antiga e pode não enviar as fotos.{upd.link ? ' Toque para baixar a nova.' : ' Peça o APK novo ao Flagra Run.'}</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 18, gap: 10 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.yellow} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={s.p}>{msg || `Nenhum evento ainda. Crie um em ${SITE_URL}/painel e puxe a lista para baixo.`}</Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => p.onPick(item)} style={({ pressed }) => [s.card, { opacity: pressed ? 0.75 : 1 }]}>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>{item.name}</Text>
            <View style={s.row}>
              <Text style={[s.mono, { color: C.dim, fontSize: 13 }]}>
                {item.event_date.split('-').reverse().join('/')} · {item.city || 'sem cidade'} · {item.photo_count} fotos
              </Text>
              <Text style={{ color: item.published ? C.green : C.yellow, fontSize: 12, fontWeight: '700', marginLeft: 'auto' }}>
                {item.published ? 'PUBLICADO' : 'RASCUNHO'}
              </Text>
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={{ marginTop: 18, gap: 8 }}>
            <Text style={[s.p, { fontSize: 13 }]}>Conectado como {p.email}</Text>
            <Btn title="Sair" kind="ghost" onPress={() => supabase.auth.signOut()} />
          </View>
        }
      />
    </View>
  );
}
