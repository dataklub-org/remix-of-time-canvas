import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import AppNavigator from './src/navigation/AppNavigator'
import { testSupabaseConnection } from './src/debug/testSupabase'

const queryClient = new QueryClient()

export default function App() {
  useEffect(() => {
    testSupabaseConnection()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AppNavigator />
      <StatusBar style="auto" />
    </QueryClientProvider>
  )
}
