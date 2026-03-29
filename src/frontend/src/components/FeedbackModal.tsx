import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { actor } = useActor();
  const { credentials } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!actor || !credentials) {
      toast.error("Not connected. Please try again.");
      return;
    }
    if (rating === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    if (message.trim().length < 10) {
      toast.error("Please write at least 10 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      await actor.submitFeedback(
        credentials.email,
        credentials.passwordHash,
        BigInt(rating),
        message.trim(),
      );
      toast.success("Thank you for your feedback!");
      setRating(0);
      setMessage("");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border border-border/60 max-w-md"
        data-ocid="feedback.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Send Feedback</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Star rating */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              How would you rate your experience?
            </p>
            <div
              className="flex items-center gap-1"
              data-ocid="feedback.toggle"
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110"
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  data-ocid={`feedback.radio.${star}`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hovered || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Tell us more (optional details)
            </p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you love? What can we improve?"
              className="resize-none min-h-[100px] bg-muted/30 border-border/50"
              data-ocid="feedback.textarea"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length} chars (min 10)
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              data-ocid="feedback.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="gradient-btn border-0 text-white"
              onClick={handleSubmit}
              disabled={
                isSubmitting || rating === 0 || message.trim().length < 10
              }
              data-ocid="feedback.submit_button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
