"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const emailInvalid = emailTouched && email.length > 0 && !EMAIL_REGEX.test(email);

  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setStatus("idle");
    setFeedback("");
    setName("");
    setEmail("");
    setEmailTouched(false);
    setErrorMsg("");
  }

  // Close on Esc
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Auto-close 2 s after success
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(closeModal, 2000);
    return () => clearTimeout(t);
  }, [status]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!feedback.trim()) return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, name, email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Couldn't send — please try again.");
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={openModal}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
      >
        {/* Chat bubble icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6l-4 4V5z"
            clipRule="evenodd"
          />
        </svg>
        Give feedback
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Card */}
          <div
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-heading"
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>

            {status === "success" ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-6 w-6 text-green-600"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900">Thanks — got it.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h2
                  id="feedback-heading"
                  className="text-lg font-semibold text-gray-900"
                >
                  Tell me what you think
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Anything confusing? Missing? What would you change?
                </p>

                <div className="mt-5 space-y-4">
                  {/* Feedback textarea */}
                  <div>
                    <label
                      htmlFor="fb-feedback"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Your feedback <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="fb-feedback"
                      rows={5}
                      required
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="e.g. The category scores confused me, I wasn't sure what 'Timeline Feasibility' meant..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label
                      htmlFor="fb-name"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Name <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="fb-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="fb-email"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Email <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="fb-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                        emailInvalid ? "border-red-400" : "border-gray-300"
                      }`}
                    />
                    {emailInvalid && (
                      <p className="mt-1 text-xs text-red-500">
                        Please enter a valid email.
                      </p>
                    )}
                  </div>
                </div>

                {/* Error banner */}
                {status === "error" && errorMsg && (
                  <p className="mt-4 text-sm text-red-600">{errorMsg}</p>
                )}

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "submitting" || !feedback.trim()}
                    className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {status === "submitting" ? (
                      <>
                        <span
                          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                          aria-hidden="true"
                        />
                        Sending...
                      </>
                    ) : (
                      "Send feedback"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
