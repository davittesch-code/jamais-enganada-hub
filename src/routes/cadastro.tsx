import { createFileRoute, redirect } from "@tanstack/react-router";

// Cadastro direto está desativado — todo acesso passa pelo checkout.
export const Route = createFileRoute("/cadastro")({
  beforeLoad: () => {
    throw redirect({ to: "/checkout" });
  },
  component: () => null,
});
