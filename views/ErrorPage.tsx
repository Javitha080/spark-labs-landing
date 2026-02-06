import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Home,
    ArrowLeft,
    AlertOctagon,
    ShieldAlert,
    ServerCrash,
    Construction,
    Hourglass,
    FileWarning,
    ArrowRightLeft,
    Ban
} from "lucide-react";
import { motion } from "framer-motion";

const ErrorPage = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();

    // Configuration for each error code
    const errorConfig: Record<string, {
        title: string;
        message: string;
        icon: React.ElementType;
        color: string;
        subtext: string;
    }> = {
        "301": {
            title: "Trajectory Shifted",
            message: "This resource has been permanently relocated to a new sector.",
            icon: ArrowRightLeft,
            color: "text-blue-400",
            subtext: "Redirecting Protocol: 301 MOVED PERMANENTLY"
        },
        "400": {
            title: "Invalid Transmission",
            message: "The server could not understand the request due to malformed syntax.",
            icon: FileWarning,
            color: "text-yellow-400",
            subtext: "Error Code: 400 BAD REQUEST"
        },
        "401": {
            title: "Authentication Required",
            message: "Access to this sector requires valid credentials.",
            icon: ShieldAlert,
            color: "text-orange-400",
            subtext: "Security Protocol: 401 UNAUTHORIZED"
        },
        "403": {
            title: "Access Restricted",
            message: "You do not have the necessary clearance to access this classified sector.",
            icon: Ban,
            color: "text-red-500",
            subtext: "Security Protocol: 403 FORBIDDEN"
        },
        "404": { // Fallback if reached via this route
            title: "Coordinates Not Found",
            message: "The requested trajectory leads into the void.",
            icon: AlertOctagon,
            color: "text-purple-400",
            subtext: "Navigation Error: 404 NOT FOUND"
        },
        "405": {
            title: "Methodology Error",
            message: "The method specified is not allowed for the resource identified.",
            icon: AlertOctagon,
            color: "text-orange-500",
            subtext: "Protocol Mismatch: 405 METHOD NOT ALLOWED"
        },
        "429": {
            title: "Flux Overload",
            message: "Too many requests received. Please wait while systems cool down.",
            icon: Hourglass,
            color: "text-yellow-500",
            subtext: "Rate Limit Exceeded: 429 TOO MANY REQUESTS"
        },
        "500": {
            title: "Core Failure",
            message: "An unexpected condition was encountered on the server deck.",
            icon: ServerCrash,
            color: "text-red-600",
            subtext: "System Critical: 500 INTERNAL SERVER ERROR"
        },
        "502": {
            title: "Bad Gateway",
            message: "Invalid response received from the upstream server.",
            icon: ServerCrash,
            color: "text-pink-500",
            subtext: "Network Error: 502 BAD GATEWAY"
        },
        "503": {
            title: "Maintenance Mode",
            message: "Systems are currently under maintenance. Please try again later.",
            icon: Construction,
            color: "text-blue-500",
            subtext: "Service Status: 503 SERVICE UNAVAILABLE"
        },
        "default": {
            title: "Unknown Error",
            message: "An unspecified anomaly has occurred.",
            icon: AlertOctagon,
            color: "text-gray-400",
            subtext: "System Error: UNKNOWN"
        }
    };

    const config = errorConfig[code || "default"] || errorConfig["default"];
    const Icon = config.icon;

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden text-center selection:bg-primary/30">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-black to-black z-0 pointer-events-none" />
            <div className={`absolute top-1/3 right-1/4 w-96 h-96 ${config.color.replace('text-', 'bg-')}/10 rounded-full blur-[120px] animate-pulse pointer-events-none`} />

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none mix-blend-overlay"></div>

            <div className="relative z-10 max-w-2xl px-4 animate-fade-up">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-8 relative inline-block"
                >
                    <div className={`absolute inset-0 ${config.color.replace('text-', 'bg-')}/20 blur-xl rounded-full animate-pulse`} />
                    <Icon className={`w-24 h-24 ${config.color} relative z-10 mx-auto`} strokeWidth={1.5} />
                </motion.div>

                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 mb-4 uppercase">
                    {code}
                </h1>

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
                    {config.title}
                </h2>

                <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                    {config.message}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto border-white/10 hover:bg-white/5 hover:text-white group"
                        asChild
                    >
                        <Link to="/">
                            <Home className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                            Return to Base
                        </Link>
                    </Button>

                    <Button
                        variant="ghost"
                        size="lg"
                        className="w-full sm:w-auto text-muted-foreground hover:text-white"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </div>

                <div className="mt-16 pt-8 border-t border-white/5">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
                        {config.subtext}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ErrorPage;
