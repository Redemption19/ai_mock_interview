"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import Vapi from "@vapi-ai/web";
import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { getResumeContent } from "@/lib/vapi.sdk";
import { vapiService } from "@/lib/vapi.sdk";

const vapi = new Vapi(process.env.VAPI_API_KEY!);

async function getVapiFile(fileId: string) {
  try {
    const response = await fetch(`https://api.vapi.ai/file/${fileId}`, {
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching file:', error);
    return null;
  }
}

export async function createInterview(params: {
  userId: string;
  type: string;
  role: string;
  techstack: string[];
}) {
  try {
    // Get user data including VAPI IDs
    const userDoc = await db.collection("users").doc(params.userId).get();
    const userData = userDoc.data();
    
    // Create the interview with VAPI context
    const interviewRef = await db.collection("interviews").add({
      userId: params.userId,
      type: params.type,
      role: params.role,
      techstack: params.techstack,
      createdAt: new Date().toISOString(),
      status: 'pending',
      vapiFileId: userData?.vapiFileId,
      vapiKnowledgeBaseId: userData?.vapiKnowledgeBaseId,
      vapiAssistantId: process.env.VAPI_ASSISTANT_ID
    });

    return {
      success: true,
      interviewId: interviewRef.id
    };
  } catch (error) {
    console.error('Error creating interview:', error);
    throw error;
  }
}

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    // Get user's resume content if available
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    let resumeContent = null;
    
    if (userData?.vapiFileId) {
      const fileData = await getVapiFile(userData.vapiFileId);
      resumeContent = fileData?.text;
    }

    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}
