"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { getResumeContent } from "@/lib/vapi.sdk";
import { vapiService } from "@/lib/vapi.sdk";

export async function createInterview(params: {
  userId: string;
  type: string;
  role: string;
  techstack: string[];
}) {
  try {
    // Get user data including VAPI file ID
    const userDoc = await db.collection("users").doc(params.userId).get();
    const userData = userDoc.data();
    
    // Get resume content if available
    let resumeContent = null;
    if (userData?.vapiFileId) {
      resumeContent = await getResumeContent(userData.vapiFileId);
    }

    // Create VAPI assistant with resume context
    const assistant = await vapiService.createAssistant({
      name: "Technical Interviewer",
      model: "gpt-4",
      tools: [{
        type: "knowledge_base",
        knowledge_base_id: userData?.vapiFileId
      }],
      instructions: `
        You are a technical interviewer conducting a ${params.type} interview for a ${params.role} position.
        Focus on these technologies: ${params.techstack.join(', ')}.
        ${resumeContent ? 'Use the candidate\'s resume to personalize questions and discussions.' : ''}
        Be professional, thorough, and evaluate responses carefully.
      `
    });

    // Create interview in database
    const interviewRef = await db.collection("interviews").add({
      userId: params.userId,
      type: params.type,
      role: params.role,
      techstack: params.techstack,
      assistantId: assistant.id,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });

    // Start VAPI call workflow
    const call = await vapiService.createCall({
      assistant_id: assistant.id!,
      workflow: {
        id: "interview_workflow",
        data: {
          type: params.type,
          role: params.role,
          techstack: params.techstack,
          resumeContent: resumeContent
        }
      }
    });

    // Update interview with call ID
    await interviewRef.update({
      callId: call.id
    });

    return {
      success: true,
      interviewId: interviewRef.id,
      callId: call.id
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
      try {
        const content = await vapiService.getFileContent(userData.vapiFileId);
        resumeContent = content.text;
      } catch (error) {
        console.error('Error retrieving resume:', error);
      }
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
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories and their resume.
        
        ${resumeContent ? 'Resume Content:\n' + resumeContent + '\n\n' : ''}
        
        Interview Transcript:
        ${formattedTranscript}

        Please analyze the candidate's responses in relation to their resume and experience. Score them from 0 to 100 in these areas:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        
        ${resumeContent ? 'Consider how well their interview responses align with their stated experience and skills in their resume.' : ''}
      `,
      system: "You are a professional interviewer analyzing a mock interview and comparing responses against the candidate's resume",
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
    console.error('Error creating feedback:', error);
    throw error;
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
