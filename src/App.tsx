import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Solo DM</h1>
      <Button>Scaffold OK</Button>
      <Toaster />
    </div>
  )
}

export default App
