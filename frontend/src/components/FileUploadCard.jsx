import React, {useState, useRef} from 'react'
import axios from 'axios'
import Spinner from './Spinner'
import Waveform from './Waveform'
import { motion } from 'framer-motion'

export default function FileUploadCard(){
  const [file, setFile] = useState(null)
  const [language, setLanguage] = useState('Tamil')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef()

  const onSubmit = async (e) =>{
    e.preventDefault()
    if(!file) return
    setLoading(true)
    setSummary('')
    setAudioUrl('')
    try{
      const form = new FormData()
      form.append('file', file)
      form.append('language', language)
      form.append('notes', notes)

      const res = await axios.post('http://127.0.0.1:8000/process', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'text'
      })

      const txt = res.data
      const parts = txt.split('\n---AUDIO---\n')
      const summ = parts[0]
      const audioPath = parts[1]
      setSummary(summ)
      setAudioUrl(audioPath)
      setTimeout(()=> window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'}), 200)
    }catch(err){
      alert('Upload failed: ' + (err.response?.data || err.message))
    }finally{
      setLoading(false)
    }
  }

  const onPlay = () =>{
    if(!audioRef.current) return
    audioRef.current.play()
    setPlaying(true)
  }
  const onPause = () =>{
    if(!audioRef.current) return
    audioRef.current.pause()
    setPlaying(false)
  }

  return (
    <motion.div className="card" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
      <h2 className="text-2xl font-semibold mb-2">Upload document — get human-like voice</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <input type="file" accept=".pdf,.docx,.txt" onChange={e=>setFile(e.target.files[0])} />
        </div>
        <div className="flex gap-3">
          <select value={language} onChange={e=>setLanguage(e.target.value)} className="p-2 rounded-md border">
            <option>Tamil</option>
            <option>English</option>
            <option>Hindi</option>
            <option>Kannada</option>
            <option>Telugu</option>
          </select>
          <input placeholder="Optional: notes for summarizer" value={notes} onChange={e=>setNotes(e.target.value)} className="flex-1 p-2 rounded-md border" />
        </div>

        <div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md" disabled={loading}>
            {loading ? <><Spinner size={18}/> <span className="ml-2">Processing...</span></> : 'Summarize & Speak'}
          </button>
        </div>
      </form>

      {summary && (
        <div className="mt-6">
          <h3 className="text-xl font-medium">Summary</h3>
          <div className="mt-2 p-4 rounded-lg bg-gray-50">
            <pre style={{whiteSpace:'pre-wrap'}}>{summary}</pre>
          </div>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Audio</h4>
            <Waveform playing={playing} />
            <div className="mt-3 flex items-center gap-3">
              <audio ref={audioRef} src={audioUrl} onEnded={()=>setPlaying(false)} />
              <button onClick={onPlay} className="px-3 py-2 bg-green-500 text-white rounded">Play</button>
              <button onClick={onPause} className="px-3 py-2 bg-gray-300 rounded">Pause</button>
              <a href={audioUrl} download className="ml-3 text-sm text-indigo-600">Download audio</a>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Spinner /> <span>Uploading file and generating summary — this may take a moment.</span>
        </div>
      )}
    </motion.div>
  )
}
