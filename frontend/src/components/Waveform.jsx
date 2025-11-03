import React, {useEffect, useRef} from 'react'

export default function Waveform({playing}){
  const ref = useRef()

  useEffect(()=>{
    const el = ref.current
    if(!el) return
    if(playing){
      el.classList.add('playing')
    } else {
      el.classList.remove('playing')
    }
  },[playing])

  return (
    <div ref={ref} className="wave-canvas overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-between px-4">
        {[...Array(20)].map((_,i)=> (
          <div key={i} className="wave-bar bg-gray-300 rounded-sm" style={{width:6, height: (i%2?18:28)}}></div>
        ))}
      </div>
      <style>{`
        .wave-canvas .wave-bar{ transition: height 280ms ease; }
        .wave-canvas.playing .wave-bar{ transform-origin: bottom; }
        .wave-canvas.playing .wave-bar:nth-child(odd){ height: 48px !important; }
        .wave-canvas.playing .wave-bar:nth-child(even){ height: 18px !important; }
      `}</style>
    </div>
  )
}
