import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { CaptureScreen } from './src/CaptureScreen';
import { C } from './src/config';
import { EventsScreen, type EventRow } from './src/EventsScreen';
import { LoginScreen } from './src/LoginScreen';
import { queue } from './src/queue';
import { supabase } from './src/supabase';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [event, setEvent] = useState<EventRow | null>(null);

  useEffect(() => {
    queue.load();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  let body;
  if (session === undefined) {
    body = (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.yellow} />
      </View>
    );
  } else if (!session) {
    body = <LoginScreen />;
  } else if (!event) {
    body = <EventsScreen userId={session.user.id} email={session.user.email ?? ''} onPick={setEvent} />;
  } else {
    body = <CaptureScreen event={event} onBack={() => setEvent(null)} />;
  }

  return (
    <>
      <StatusBar style="light" />
      {body}
    </>
  );
}
