import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthForm } from '../components/AuthForm'
import { getCurrentUser } from '../lib/supabase'

export default function Login() {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        
        // If user is already logged in, redirect to dashboard
        if (user) {
          navigate('/dashboard')
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [navigate])

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">SimpleMDM Geo Profile Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage device profiles based on location and network</p>
      </div>
      
      <AuthForm />
    </div>
  )
}
