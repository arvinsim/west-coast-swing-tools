import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'

export const Route = createFileRoute('/pattern-randomizer')({
  component: PatternRandomizer,
})

const synth = window.speechSynthesis

interface Move {
    id: string;
    names: string[];
    beats: number;
    entry: string[];
    exit: string[];
}

interface MovesData {
    moves: Move[];
}

function PatternRandomizer() {
    const [bpm, setBpm] = useState(90)
    const [isRunning, setIsRunning] = useState(false)
    const [volume, setVolume] = useState(0.5)
    const [beatEnabled, setBeatEnabled] = useState(true)
    const [moves, setMoves] = useState<Move[]>([])
    const [currentMove, setCurrentMove] = useState<Move | null>(null)
    const [nextMove, setNextMove] = useState<Move | null>(null)
    
    const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const calloutTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const beatIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const beatCountRef = useRef(0)
    const moveStartTimeRef = useRef<number>(0)

    useEffect(() => {
        // Load moves data
        const basePath = import.meta.env.BASE_URL || '/';
        fetch(`${basePath}moves.json`)
            .then(response => response.json())
            .then((data: MovesData) => {
                setMoves(data.moves);
            })
            .catch(error => {
                console.error('Failed to load moves:', error);
                // Fallback to default move
                setMoves([{ 
                    id: 'sugar-push', 
                    names: ['Sugar Push'], 
                    beats: 6,
                    entry: ['L-R'], 
                    exit: ['L-R'] 
                }]);
            });
    }, []);


    // @ts-expect-error
    const getRandomMove = (exitState?: string[]): Move => {
        if (moves.length === 0) {
            return { 
                id: 'sugar-push', 
                names: ['Sugar Push'], 
                beats: 6,
                entry: ['L-R'], 
                exit: ['L-R'] 
            };
        }
        
        // For now, just return a random move
        // TODO: Implement proper state machine filtering based on exitState
        return moves[Math.floor(Math.random() * moves.length)];
    };

    const speak = (moveName: string) => {
        const utterThis = new SpeechSynthesisUtterance(moveName);
        const voices = synth.getVoices();
        const voice = voices.find(v => v.name === "Google US English");
        if (voice) {
            utterThis.voice = voice;
        }
        synth.speak(utterThis);
    };

    const playBeat = () => {
        if (!beatEnabled) return;
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Use different frequency for beats that are multiples of 4 (end of measures)
        const frequency = (beatCountRef.current % 4 === 3) ? 1200 : 800;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    };

    const playMove = (move: Move) => {
        console.log(`Starting: ${move.names[0]} (${move.beats} beats)`);
        
        setCurrentMove(move);
        moveStartTimeRef.current = Date.now();
        
        const BEAT_MS = (60 / bpm) * 1000;
        const LOOKAHEAD_BEATS = 2;
        
        // Calculate when to announce the next move (2 beats before current move ends)
        const calloutDelay = (move.beats - LOOKAHEAD_BEATS) * BEAT_MS;
        
        // Schedule the voice callout for the NEXT move
        calloutTimeoutRef.current = setTimeout(() => {
            const nextMoveToPlay = getRandomMove(move.exit);
            setNextMove(nextMoveToPlay);
            speak(`Next move: ${nextMoveToPlay.names[0]}`);
            
            // Schedule the next move to start exactly when current move ends
            moveTimeoutRef.current = setTimeout(() => {
                playMove(nextMoveToPlay);
            }, LOOKAHEAD_BEATS * BEAT_MS);
            
        }, calloutDelay);
    };

    const startBeatMetronome = () => {
        const BEAT_MS = (60 / bpm) * 1000;
        beatCountRef.current = 0;
        
        beatIntervalRef.current = setInterval(() => {
            playBeat();
            beatCountRef.current += 1;
        }, BEAT_MS);
    };

    const stopAll = () => {
        // Clear all timeouts and intervals
        if (moveTimeoutRef.current) {
            clearTimeout(moveTimeoutRef.current);
            moveTimeoutRef.current = null;
        }
        if (calloutTimeoutRef.current) {
            clearTimeout(calloutTimeoutRef.current);
            calloutTimeoutRef.current = null;
        }
        if (beatIntervalRef.current) {
            clearInterval(beatIntervalRef.current);
            beatIntervalRef.current = null;
        }
        
        beatCountRef.current = 0;
        setCurrentMove(null);
        setNextMove(null);
        setIsRunning(false);
    };

    const toggleRandomizer = () => {
        if (isRunning) {
            stopAll();
        } else {
            if (moves.length === 0) return;
            
            setIsRunning(true);
            
            // Start the beat metronome
            startBeatMetronome();
            
            // Start with the first move
            const firstMove = getRandomMove();
            playMove(firstMove);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
            <div className="text-3xl font-bold text-red-900 mb-6">Pattern Randomizer</div>
            
            {/* Current and Next Move Display */}
            {isRunning && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Move</h3>
                        <p className="text-xl font-bold text-gray-800">
                            {currentMove ? currentMove.names[0] : 'Starting...'}
                        </p>
                        {currentMove && (
                            <p className="text-sm text-gray-600 mt-1">{currentMove.beats} beats</p>
                        )}
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                        <h3 className="text-lg font-semibold text-green-900 mb-2">Next Move</h3>
                        <p className="text-xl font-bold text-gray-800">
                            {nextMove ? nextMove.names[0] : 'Preparing...'}
                        </p>
                        {nextMove && (
                            <p className="text-sm text-gray-600 mt-1">{nextMove.beats} beats</p>
                        )}
                    </div>
                </div>
            )}
            
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