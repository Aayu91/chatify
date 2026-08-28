import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";

export const arcjetProtection = async (req, res, next) => {
    try{
        const decision = await aj.inspect(req);
        if(decision.reason.isRatelimit()){
            return res.status(429).json({ message: "Rate limit exceeded. Please try again later." });
        }
        else if(decision.reason.isBot()){
            return res.status(403).json({ message: "Access denied. Bot traffic is not allowed." });
        }else{
            return res.status(403).json({ message: "Access denied. Suspicious activity detected." });
        }
    
     if (decision.result.some(isSpoofedBot)) {
        return res.status(403).json({ error:"spoofed bot detected",message: "Access denied. Spoofed bot traffic detected." });
    }
    next();
    }
    catch (error) {
        console.log("Arcjet protection error:", error);
        next();
    }
};

    