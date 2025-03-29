export const interviewWorkflow = {
  id: "interview_workflow",
  steps: [
    {
      name: "introduction",
      speech: `Hello! I'll be conducting your {{type}} interview for the {{role}} position today. 
      I've reviewed your resume and will be asking questions related to your experience and the required skills.`,
    },
    {
      name: "background",
      speech: "Could you start by telling me about your relevant experience in {{role}}?",
      expect: {
        user: {
          timeout: 120000,
        },
      },
    },
    {
      name: "technical_questions",
      speech: "Great. Now, let's focus on some technical questions related to {{techstack}}.",
      expect: {
        user: {
          timeout: 120000,
        },
      },
    },
    // Add more interview steps as needed
  ],
}; 