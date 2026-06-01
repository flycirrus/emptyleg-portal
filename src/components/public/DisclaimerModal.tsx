"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function DisclaimerModal() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show to logged in users
    if (!session?.user) return;

    // Do not show to ADMIN or MANAGER
    const role = (session.user as any).role;
    if (role === "ADMIN" || role === "MANAGER") return;

    // Check if they already accepted
    const hasAccepted = localStorage.getItem(`acceptedTerms_${session.user.id}`);
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, [session]);

  const handleAccept = () => {
    if (session?.user) {
      localStorage.setItem(`acceptedTerms_${session.user.id}`, "true");
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">
            Please read and accept our Terms and Conditions before continuing.
          </h2>
          
          <div className="space-y-4 text-gray-300 text-sm sm:text-base leading-relaxed">
            <p>
              <strong className="text-white">Standby-Only Basis:</strong> All flights are offered on a standby-only basis, and schedules may be canceled or amended by HypeJets at any time.
            </p>
            <p>
              <strong className="text-white">Intellectual Property Rights:</strong> Unless otherwise stated, HypeJets and/or its licensors own the intellectual property rights on the website and material on the website. Subject to the license below, all these intellectual property rights are reserved.
            </p>
            <p>
              <strong className="text-white">Personal Use License:</strong> You may view, download for caching purposes only, and print pages from the website for your personal use, subject to the restrictions set out below and elsewhere in these terms and conditions.
            </p>
            
            <p><strong className="text-white">Restrictions:</strong> You must not:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Republish material from this website (including republication on another website).</li>
              <li>Sell, rent, or sub-license material from the website.</li>
              <li>Show any material from the website in public.</li>
              <li>Reproduce, duplicate, copy, or otherwise exploit material on this website for a commercial purpose.</li>
              <li>Edit or otherwise modify any material on the website.</li>
              <li>Redistribute material from this website (except for content specifically and expressly made available for redistribution).</li>
              <li>By clicking the accept button, you accept these terms and conditions.</li>
            </ul>

            <p>
              <strong className="text-white">Violation Policy:</strong> Any violation will be prosecuted and will result in the ban of the specific passenger from all HypeJets flights.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-800">
            <button
              onClick={handleAccept}
              className="w-full sm:w-auto px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#111827]"
            >
              Accept and Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
