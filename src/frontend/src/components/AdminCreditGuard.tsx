import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";

const ADMIN_EMAIL = "ashmitrastogi105@email.com";

export function AdminCreditGuard() {
  const { user } = useAuth();
  const { actor } = useActor();
  const qc = useQueryClient();
  const grantedRef = useRef(false);

  useEffect(() => {
    if (!grantedRef.current && actor && user?.email === ADMIN_EMAIL) {
      grantedRef.current = true;
      actor
        .adminSetCredits(ADMIN_EMAIL, BigInt(100))
        .then(() => {
          qc.invalidateQueries({ queryKey: ["credits"] });
        })
        .catch(() => {
          grantedRef.current = false;
        });
    }
  }, [actor, user, qc]);

  return null;
}
