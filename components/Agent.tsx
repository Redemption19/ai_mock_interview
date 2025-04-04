"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
  profileURL?: string;
}

type Message = {
  role: "user" | "system" | "assistant";
  type: string;
  transcriptType: string;
  transcript: string;
};

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  profileURL,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  useEffect(() => {
    const onCallStart = () => {
      console.log('Call started');
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = () => {
      console.log('Call ended');
      setCallStatus(CallStatus.FINISHED);
      if (isVideoEnabled) {
        setIsVideoEnabled(false);
      }
    };

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => {
      console.log("speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("speech end");
      setIsSpeaking(false);
    };

    const onError = (error: Error) => {
      console.error("VAPI Error:", error);
      setCallStatus(CallStatus.INACTIVE);
      alert('The call encountered an error. Please try again.');
    };

    // Add error handling for unexpected disconnections
    const handleVisibilityChange = () => {
      if (document.hidden && callStatus === CallStatus.ACTIVE) {
        handleDisconnect();
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (callStatus === CallStatus.ACTIVE) {
        vapi.stop();
      }
    };
  }, [callStatus, isVideoEnabled]);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("handleGenerateFeedback");

      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.log("Error saving feedback");
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/");
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  const handleCall = async () => {
    try {
      setCallStatus(CallStatus.CONNECTING);

      // Make sure VAPI is properly initialized
      if (!vapi) {
        throw new Error('VAPI not initialized');
      }

      if (type === "generate") {
        if (!process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID) {
          throw new Error('VAPI workflow ID not configured');
        }

        await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID, {
          variableValues: {
            username: userName,
            userid: userId,
          },
        });
      } else {
        let formattedQuestions = "";
        if (questions) {
          formattedQuestions = questions
            .map((question) => `- ${question}`)
            .join("\n");
        }

        await vapi.start(interviewer, {
          variableValues: {
            questions: formattedQuestions,
          },
        });
      }
    } catch (error) {
      console.error('Call initialization error:', error);
      setCallStatus(CallStatus.INACTIVE);
      alert('Failed to start the interview. Please try again.');
    }
  };

  const handleDisconnect = () => {
    try {
      setCallStatus(CallStatus.FINISHED);
      if (isVideoEnabled) {
        setIsVideoEnabled(false);
      }
      vapi.stop();
    } catch (error) {
      console.error('Error during disconnect:', error);
      // Force status reset even if error occurs
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  // Add reconnection logic
  useEffect(() => {
    const handleReconnection = async () => {
      if (callStatus === CallStatus.ACTIVE && !navigator.onLine) {
        handleDisconnect();
        alert('Lost connection. Please try starting the interview again.');
      }
    };

    window.addEventListener('online', handleReconnection);
    window.addEventListener('offline', handleReconnection);

    return () => {
      window.removeEventListener('online', handleReconnection);
      window.removeEventListener('offline', handleReconnection);
    };
  }, [callStatus]);

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleWebcamError = useCallback((err: string | DOMException) => {
    console.error('Webcam error:', err);
    setIsVideoEnabled(false);
    alert('Could not access camera. Please make sure you have granted camera permissions.');
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup video when component unmounts
      if (isVideoEnabled) {
        setIsVideoEnabled(false);
      }
    };
  }, []);

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            {isVideoEnabled ? (
              <div className="video-container">
                <Webcam
                  audio={false}
                  mirrored={true}
                  videoConstraints={videoConstraints}
                  className="video-stream"
                  onUserMediaError={handleWebcamError}
                />
              </div>
            ) : (
              <Image
                src={profileURL || "/user-avatar.png"}
                alt="profile-image"
                width={539}
                height={539}
                className="rounded-full object-cover size-[120px]"
              />
            )}
            <h3 className="mt-4">{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="interview-controls">
        <button
          onClick={toggleVideo}
          className="btn-camera"
        >
          {isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
        </button>

        {callStatus !== "ACTIVE" ? (
          <button className="btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />
            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
