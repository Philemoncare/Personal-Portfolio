import { ArcadeLanding } from "@/components/arcade/ArcadeLanding";
import { Container } from "@/components/ui/container";
import { useSeo } from "@/hooks/useSeo";

export default function ArcadePage() {
  useSeo({
    title: "Arcade 🎮 | Philemon Melabah",
    description: "Take a break and test your skills with lightweight arcade games.",
  });

  return (
    <Container className="py-12 sm:py-16">
      <ArcadeLanding />
    </Container>
  );
}
