import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2 } from 'lucide-react'

export default function Callback() {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash with the access token
        const hash = window.location.hash
        
        console.log('Processing auth callback at /callback with hash:', hash)
        
        if (hash) {
          // Extract tokens from the hash
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (!accessToken) {
            throw new Error('No access token found in URL')
          }
          
          console.log('Access token found, setting session')
          
          // Set the session with the tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })
          
          if (sessionError) {
            throw sessionError
          }
          
          // Set auth flag in localStorage
          localStorage.setItem('isAuthenticated', 'true')
          
          // Redirect to dashboard after successful authentication
          navigate('/dashboard', { replace: true })
        } else {
          // If there's no hash but we're on this route, check if we're already authenticated
          const { data, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            throw sessionError
          }
          
          if (data.session) {
            // Already authenticated, redirect to dashboard
            navigate('/dashboard', { replace: true })
          } else {
            // No session and no hash, redirect to login
            navigate('/login', { replace: true })
          }
        }
      } catch (err: any) {
        console.error('Auth callback error:', err)
        setError(err.message || 'Authentication failed')
        
        // On error, redirect to login after a delay
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      {error ? (
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p>Redirecting you to login...</p>
        </div>
      ) : (
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold">Completing login...</h2>
          <p className="text-muted-foreground">Please wait while we redirect you.</p>
        </div>
      )}
    </div>
  )
}