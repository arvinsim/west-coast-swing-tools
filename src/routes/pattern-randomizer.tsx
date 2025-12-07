import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'

export const Route = createFileRoute('/pattern-randomizer')({
  component: PatternRandomizer,
})

const synth = window.speechSynthesis

function PatternRandomizer() {
    const [bpm, setBpm] = useState(80)
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
    const [beatIntervalId, setBeatIntervalId] = useState<NodeJS.Timeout | null>(null)
    const [isRunning, setIsRunning] = useState(false)
    const [volume, setVolume] = useState(0.5)
    const [beatEnabled, setBeatEnabled] = useState(true)
    const beatCountRef = useRef(0)

    const say = () => {
        const utterThis = new SpeechSynthesisUtterance("Sugar Push");
        const voices = synth.getVoices();
        const voice = voices.find(v => v.name === "Google US English");
        if (voice) {
            utterThis.voice = voice;
        }
        synth.speak(utterThis);
    }

    const playBeat = () => {
        if (!beatEnabled) return;
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Use different frequency for 4th beat (when beatCountRef.current % 4 === 3)
        const frequency = (beatCountRef.current % 4 === 3) ? 1200 : 800;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    const toggleRandomizer = () => {
        if (isRunning) {
            // Stop the randomizer
            if (intervalId) {
                clearInterval(intervalId);
                setIntervalId(null);
            }
            if (beatIntervalId) {
                clearInterval(beatIntervalId);
                setBeatIntervalId(null);
            }
            beatCountRef.current = 0;
            setIsRunning(false);
        } else {
            // Start the randomizer
            const beatInterval = (60 / bpm) * 1000; // 1 beat in milliseconds
            beatCountRef.current = 0;
            
            const newBeatIntervalId = setInterval(() => {
                // Check current beat position
                const currentBeat = beatCountRef.current % 4;
                
                // Play beat sound
                playBeat();
                
                // Call out only on beat 2 (when currentBeat === 1)
                if (currentBeat === 1) {
                    say();
                }
                
                // Increment beat count
                beatCountRef.current += 1;
            }, beatInterval);
            
            setBeatIntervalId(newBeatIntervalId);
            setIsRunning(true);
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
            <div className="text-3xl font-bold text-red-900 mb-6">Pattern Randomizer</div>
            
            <div className="mb-4 flex flex-col items-center">
                <label className="text-red-800 font-semibold mb-2">BPM</label>
                <input 
                type="number" 
                value={bpm} 
                onChange={(e) => setBpm(Number(e.target.value))} 
                className="px-4 py-2 border-2 border-red-400 rounded-lg focus:outline-none focus:border-red-600 text-center"
                />
            </div>
            
            <div className="mb-4 flex flex-col items-center">
                <label className="text-red-800 font-semibold mb-2">Volume</label>
                <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={volume} 
                onChange={(e) => setVolume(Number(e.target.value))} 
                className="w-48 accent-red-600"
                />
                <span className="text-red-700 text-sm mt-1">{Math.round(volume * 100)}%</span>
            </div>
            
            <div className="mb-6 flex items-center">
                <label className="text-red-800 font-semibold mr-3">Beat Sound:</label>
                <button 
                onClick={() => setBeatEnabled(!beatEnabled)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    beatEnabled 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
                >
                {beatEnabled ? 'On' : 'Off'}
                </button>
            </div>
            
            <button 
            onClick={toggleRandomizer} 
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
            {isRunning ? 'Stop' : 'Start'}
            </button>
        </div>
    )
}