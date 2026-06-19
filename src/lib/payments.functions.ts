import { createServerFn } from "@tanstack/react-start";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((data: { priceId: string; environment: "sandbox" | "live" }) => data)
  .handler(async ({ data }) => {
    const { gatewayFetch } = await import("@/lib/paddle.server");
    const res = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    const json = await res.json();
    if (!json.data?.length) throw new Error(`Price não encontrado: ${data.priceId}`);
    return json.data[0].id as string;
  });
