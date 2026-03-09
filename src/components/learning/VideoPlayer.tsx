import { useState, useRef, useEffect } from "react";
import ReactPlayer from "react-player";
import confetti from "canvas-confetti";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
    url: string;
    onEnded?: () => void;
    onProgress?: (progress: number) => void;
    autoPlay?: boolean;
    title?: string;
}

export function VideoPlayer({ url, onEnded, onProgress, autoPlay = false }: VideoPlayerProps) {
    const [playing, setPlaying] = useState(autoPlay);
    const [ready, setReady] = useState(false);
    const [ended, setEnded] = useState(false);
    const playerRef = useRef<{ seekTo(amount: number): void } | null>(null);

    // Reset playing/ended state when url or autoPlay changes
    useEffect(() => {
        setPlaying(autoPlay); // eslint-disable-line react-hooks/set-state-in-effect -- resetting state on prop change
        setEnded(false);
    }, [url, autoPlay]);

    const handleEnded = () => {
        setEnded(true);
        if (onEnded) onEnded();

        // Confetti effect on completion
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    };

    const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
        if (!ended && onProgress) {
            // Convert to percentage 0-100
            onProgress(state.played * 100);
        }
    };

    return (
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-xl group">
            {!ready && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            )}

            <ReactPlayer
                {...({
                    ref: playerRef,
                    url,
                    width: "100%",
                    height: "100%",
                    playing,
                    controls: true,
                    onReady: () => setReady(true),
                    onEnded: handleEnded,
                    onProgress: handleProgress,
                    config: {
                        youtube: {
                            playerVars: { showinfo: 0, controls: 1, modestbranding: 1 },
                        },
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any)}
            />

            {/* Overlay when ended */}
            {ended && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm animate-in fade-in">
                    <h3 className="text-white text-xl font-bold mb-4">Lesson Completed!</h3>
                    <div className="flex gap-4">
                        <Button
                            onClick={() => { setEnded(false); setPlaying(true); playerRef.current?.seekTo(0); }}
                            variant="secondary"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" /> Replay
                        </Button>
                        {/* Next lesson button could be handled by parent, but we show completion state here */}
                    </div>
                </div>
            )}
        </div>
    );
}
