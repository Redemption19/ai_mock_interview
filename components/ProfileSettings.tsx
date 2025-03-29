"use client";

import { z } from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import Image from "next/image";

import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import { uploadToCloudinary } from "@/lib/utils";
import { updateUserProfile } from "@/lib/actions/auth.action";

const profileFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileSettings({ user }: { user: any }) {
  const [isLoading, setIsLoading] = useState(false);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(user.profileURL || null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || "",
      email: user.email || "",
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    try {
      let profileURL = user.profileURL;
      let resumeURL = user.resumeURL;
      let resumeText = user.resumeText;

      if (profileFile) {
        profileURL = await uploadToCloudinary(profileFile, 'profile');
      }

      if (resumeFile) {
        resumeURL = await uploadToCloudinary(resumeFile, 'resume');
        // You might want to implement resume parsing here
        // resumeText = await parseResume(resumeFile);
      }

      const result = await updateUserProfile({
        uid: user.id,
        ...data,
        profileURL,
        resumeURL,
        resumeText,
      });

      if (result.success) {
        toast.success("Profile updated successfully");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="card-border w-[90%] max-w-[566px] mx-auto">
      <div className="flex flex-col gap-6 card py-8 px-6 sm:py-14 sm:px-16">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Image
              src={previewImage || "/user-avatar.png"}
              alt="Profile"
              width={100}
              height={100}
              className="rounded-full object-cover w-24 h-24"
            />
            <button
              className="absolute bottom-0 right-0 p-2 bg-primary-200 rounded-full"
              onClick={() => document.getElementById("profile-upload")?.click()}
            >
              <Upload className="w-4 h-4 text-dark-100" />
            </button>
          </div>
          <input
            id="profile-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfileImageChange}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="form space-y-6">
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
                placeholder="eg. john@example.com"
                type="email"
                className="input"
              />
            </div>

            <div className="space-y-3">
              <label className="label">Resume</label>
              <div
                className="btn-upload"
                onClick={() => document.getElementById("resume-upload")?.click()}
              >
                <Upload className="w-5 h-5" />
                <span>
                  {resumeFile?.name || user.resumeURL ? "Change resume" : "Upload a resume"}
                </span>
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
              </div>
              {(resumeFile || user.resumeURL) && (
                <p className="text-sm text-primary-100">
                  Current resume: {resumeFile?.name || "Previously uploaded resume"}
                </p>
              )}
            </div>

            <Button className="btn" type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner className="border-dark-100" />
                  <span>Updating...</span>
                </div>
              ) : (
                "Update Profile"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
} 