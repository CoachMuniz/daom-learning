import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getUserEnrollments,
  getUserMaterialEntitlements,
  getUserCertificates,
  getUserAttendance,
} from "@/lib/db/repository";
import { CampusClient } from "./CampusClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campus de Alumnos • Biblioteca Académica | DAOM Learning",
  description: "Acceso permanente a capacitaciones, materiales preparatorios, grabaciones masterizadas y certificados de DAOM Learning.",
};

export default async function CampusPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/campus");
  }

  const enrollments = await getUserEnrollments(user.id);
  const materials = await getUserMaterialEntitlements(user.id);
  const certificates = await getUserCertificates(user.id);
  const attendances = await getUserAttendance(user.id);

  return (
    <CampusClient
      user={{
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        profile: user.profile,
      }}
      enrollments={enrollments}
      materials={materials}
      certificates={certificates}
      attendances={attendances}
    />
  );
}
