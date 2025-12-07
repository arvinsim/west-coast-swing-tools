import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'

export const Route = createFileRoute('/pattern-randomizer')({
  component: PatternRandomizer,
})

const synth = window.speechSynthesis

interface Move {
    id: string;
    names: string[];
    entry: string;
    exit: string;
}

interface MovesData {
    moves: Move[];
}

function PatternRandomizer() {
    const [bpm, setBpm] = useState(80)
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
    const [beatIntervalId, setBeatIntervalId] = useState<NodeJS.Timeout | null>(null)
    const [isRunning, setIsRunning] = useState(false)
    const [volume, setVolume] = useState(0.5)
    const [beatEnabled, setBeatEnabled] = useState(true)
    const [moves, setMoves] = useState<Move[]>([])
    const beatCountRef = useRef(0)

    useEffect(() => {
        // Load moves data
        fetch('/moves.json')
            .then(response => response.json())
            .then((data: MovesData) => {
                setMoves(data.moves);
            })
            .catch(error => {
                console.error('Failed to load moves:', error);
                // Fallback to default move
                setMoves([{ id: 'sugar-push', names: ['Sugar Push'], entry: 'open', exit: 'open' }]);
            });
    }, []);

    const say = () => {
        if (moves.length === 0) return;
        
        // Randomly select a move
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        const moveName = randomMove.names[0];
        
        const utterThis = new SpeechSynthesisUtterance(moveName);
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
        
        // Use different frequency for 4th and 8th beats (when beatCountRef.current % 8 === 3 or beatCountRef.current % 8 === 7)
        const beatPosition = beatCountRef.current % 8;
        const frequency = (beatPosition === 3 || beatPosition === 7) ? 1200 : 800;
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
                // Check current beat position in 8-beat pattern
                const currentBeat = beatCountRef.current % 8;
                
                // Play beat sound
                playBeat();
                
                // Call out on beat 4 of the 8-beat pattern (when currentBeat === 3)
                if (currentBeat === 3) {
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
            
            <div className="mb-6 max-w-2xl bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
                <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-red-900 mb-2">About WCS Tempo</h3>
                        <p className="text-gray-700 leading-relaxed">
                            West Coast Swing (WCS) has a very flexible tempo, commonly danced between 80-130 BPM, but ideal social tempos are often cited around 90-110 BPM, with faster tracks extending to 120+ BPM and slower tracks going down to 80 BPM or even lower for advanced dancers, allowing for varied styles from smooth to energetic. Beginners usually start around 90-100 BPM, while experienced dancers can handle the full range, with slower songs focusing on connection and faster ones on bigger movements.
                        </p>
                    </div>
                </div>
            </div>
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