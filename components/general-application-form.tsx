"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ApplicationFormProps {
    jobId?: number | string;
    jobTitle?: string;
}

const COUNTRY_CODES = [
    { code: "+91", label: "IN (+91)" },
    { code: "+1", label: "US (+1)" },
];

export function ApplicationForm({ jobId, jobTitle }: ApplicationFormProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        linkedin: "",
        resumeUrl: "",
        coverLetter: "",
        referredBy: "",
        phoneCode: "+91",
        phoneNumber: "",
        portfolioLinks: [""]
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const data = new FormData();
        data.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: data,
            });
            const json = await res.json();
            if (json.url) {
                setFormData((prev) => ({ ...prev, resumeUrl: json.url }));
            }
        } catch (err) {
            console.error("Upload failed", err);
        }
    };

    const addLink = () => {
        setFormData(prev => ({ ...prev, portfolioLinks: [...prev.portfolioLinks, ""] }));
    };

    const updateLink = (index: number, value: string) => {
        const newLinks = [...formData.portfolioLinks];
        newLinks[index] = value;
        setFormData(prev => ({ ...prev, portfolioLinks: newLinks }));
    };

    const removeLink = (index: number) => {
        const newLinks = formData.portfolioLinks.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, portfolioLinks: newLinks }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const fullPhone = formData.phoneNumber ? `${formData.phoneCode} ${formData.phoneNumber}` : "";

            const res = await fetch("/api/applications", {
                method: "POST",
                body: JSON.stringify({
                    ...formData,
                    phone: fullPhone,
                    portfolio_links: formData.portfolioLinks.filter(l => l.trim() !== ""),
                    status: "pending",
                    job_id: jobId || null,
                }),
                headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
                setSuccess(true);
            }
        } catch (err) {
            console.error("Submission failed", err);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Card className="max-w-md mx-auto text-center p-8">
                <h3 className="text-xl font-bold text-green-600 mb-2">Application Received!</h3>
                <p className="text-muted-foreground">
                    {jobId
                        ? `Thanks for applying to the ${jobTitle} position. We'll be in touch soon.`
                        : "Thanks for reaching out. We'll keep your details on file for future openings."}
                </p>
            </Card>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>{jobId ? `Apply for ${jobTitle}` : "Can't find what you're looking for?"}</CardTitle>
                <CardDescription>
                    {jobId
                        ? "Please fill out the form below to submit your application."
                        : "Submit a general application and we'll contact you when a suitable position opens up."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Mobile Number</Label>
                        <div className="flex gap-2">
                            <select
                                className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-[110px]"
                                value={formData.phoneCode}
                                onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                            >
                                {COUNTRY_CODES.map(c => (
                                    <option
                                        key={c.code} value={c.code}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                            <Input
                                type="tel"
                                placeholder="Phone Number"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn URL (Optional)</Label>
                        <Input
                            id="linkedin"
                            value={formData.linkedin}
                            onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Portfolio / Website Links</Label>
                        {formData.portfolioLinks.map((link, index) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    placeholder="https://..."
                                    value={link}
                                    onChange={(e) => updateLink(index, e.target.value)}
                                />
                                {index === formData.portfolioLinks.length - 1 ? (
                                    <Button type="button" variant="outline" onClick={addLink}>+</Button>
                                ) : (
                                    <Button type="button" variant="outline" onClick={() => removeLink(index)}>x</Button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="resume">Resume (PDF)</Label>
                        <Input
                            id="resume"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileUpload}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="referredBy">Referred By (Optional)</Label>
                        <Input
                            id="referredBy"
                            placeholder="Name of the person who referred you"
                            value={formData.referredBy}
                            onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Submitting..." : jobId ? "Submit Application" : "Submit General Application"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

// Export as GeneralApplicationForm for backward compatibility with page.tsx
export function GeneralApplicationForm() {
    return <ApplicationForm />;
}
