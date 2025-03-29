"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import Spinner from "@/components/ui/spinner";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { signIn, signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";
import { uploadToCloudinary, parseResume } from "@/lib/utils";

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(3),
    profilePicture: z.any().optional(),
    resume: z.any().optional(),
  });
};

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  const formSchema = authFormSchema(type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (type === "sign-up") {
        const { name, email, password } = data;

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        let profileURL, resumeURL, resumeText;
        
        if (profileFile) {
          try {
            profileURL = await uploadToCloudinary(profileFile, 'profile');
          } catch (error) {
            console.error('Profile upload error:', error);
            toast.error('Failed to upload profile picture');
          }
        }

        if (resumeFile) {
          try {
            resumeURL = await uploadToCloudinary(resumeFile, 'resume');
            resumeText = await parseResume(resumeFile);
          } catch (error) {
            console.error('Resume upload error:', error);
            toast.error('Failed to upload resume');
          }
        }

        const result = await signUp({
          uid: userCredential.user.uid,
          name: name!,
          email,
          profileURL,
          resumeURL,
          resumeText,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push("/sign-in");
      } else {
        const { email, password } = data;
        
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        const idToken = await userCredential.user.getIdToken();
        
        const result = await signIn({
          email,
          idToken,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        router.push("/");
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Invalid email or password');
      } else {
        toast.error('Failed to sign in. Please try again.');
      }
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isSignIn = type === "sign-in";

  const getProfileFileName = () => {
    if (!profileFile) return "Upload an image";
    return profileFile.name.length > 20 
      ? profileFile.name.substring(0, 20) + "..."
      : profileFile.name;
  };

  const getResumeFileName = () => {
    if (!resumeFile) return "Upload a pdf";
    return resumeFile.name.length > 20 
      ? resumeFile.name.substring(0, 20) + "..."
      : resumeFile.name;
  };

  const getFileSize = (file: File) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (file.size === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(file.size) / Math.log(1024)).toString());
    return Math.round((file.size / Math.pow(1024, i))) + ' ' + sizes[i];
  };

  const validateResumeFile = (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return false;
    }

    // Check file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return false;
    }

    return true;
  };

  return (
    <div className="card-border w-[90%] max-w-[566px] mx-auto">
      <div className="flex flex-col gap-6 card py-8 px-6 sm:py-14 sm:px-16">
        <div className="flex flex-row gap-2 justify-center">
          <Image src="/logo.svg" alt="logo" height={32} width={38} />
          <h2 className="text-primary-100">PrepWise</h2>
        </div>

        <h3 className="text-center">Practice job interviews with AI</h3>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="form space-y-6 mt-4"
          >
            {!isSignIn && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="label">Full name</label>
                    <Input
                      {...form.register("name")}
                      placeholder="eg. John Doe"
                      className="input"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="label">Email</label>
                    <Input
                      {...form.register("email")}
                      placeholder="eg. doe@example.com"
                      type="email"
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="label">Password</label>
                    <Input
                      {...form.register("password")}
                      type="password"
                      placeholder="Enter your password"
                      className="input"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="label">Profile picture</label>
                    <div
                      className="btn-upload flex justify-between"
                      onClick={() => document.getElementById("profile-upload")?.click()}
                    >
                      <div className="flex items-center gap-1.5">
                        <Upload className="w-5 h-5" />
                        <span className="text-sm sm:text-base">{getProfileFileName()}</span>
                      </div>
                      {profileFile && (
                        <span className="text-primary-100 text-sm">✓</span>
                      )}
                      <input
                        id="profile-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="label">Resume</label>
                  <div
                    className="btn-upload flex justify-between items-center"
                    onClick={() => !isUploadingResume && document.getElementById("resume-upload")?.click()}
                  >
                    <div className="flex items-center gap-1.5">
                      {isUploadingResume ? (
                        <>
                          <Spinner className="border-primary-100" />
                          <span className="text-sm sm:text-base">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          {resumeFile ? (
                            <div className="flex flex-col">
                              <span className="text-sm sm:text-base truncate max-w-[200px]">
                                {resumeFile.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                {getFileSize(resumeFile)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm sm:text-base">
                              Upload PDF or Word doc
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {resumeFile && !isUploadingResume && (
                      <div className="flex items-center gap-2">
                        <span className="text-primary-100 text-sm">✓</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResumeFile(null);
                          }}
                          className="text-gray-400 hover:text-gray-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && validateResumeFile(file)) {
                          setIsUploadingResume(true);
                          try {
                            setResumeFile(file);
                          } finally {
                            setIsUploadingResume(false);
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Accepted formats: PDF, DOC, DOCX (Max 5MB)
                  </p>
                </div>
              </>
            )}

            {isSignIn && (
              <>
                <div className="space-y-3">
                  <label className="label">Email</label>
                  <Input
                    {...form.register("email")}
                    placeholder="Your email address"
                    type="email"
                    className="input"
                  />
                </div>

                <div className="space-y-3">
                  <label className="label">Password</label>
                  <Input
                    {...form.register("password")}
                    type="password"
                    placeholder="Enter your password"
                    className="input"
                  />
                </div>
              </>
            )}

            <Button 
              className="btn flex items-center justify-center gap-2" 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="border-dark-100" />
                  <span>{type === "sign-up" ? "Creating account..." : "Signing in..."}</span>
                </>
              ) : (
                <span>{type === "sign-up" ? "Create an account" : "Sign In"}</span>
              )}
            </Button>
          </form>
        </Form>

        <p className="text-center text-light-100 text-sm sm:text-base">
          {isSignIn ? "No account yet?" : "Have an account already?"}
          <Link
            href={!isSignIn ? "/sign-in" : "/sign-up"}
            className="font-semibold text-primary-100 ml-1 hover:text-primary-100/90"
          >
            {!isSignIn ? "Sign In" : "Sign Up"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
