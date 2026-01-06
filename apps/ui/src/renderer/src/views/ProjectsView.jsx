import React from "react";
import { useNavigate } from "react-router-dom";
import { ProjectLauncher } from "../components/ProjectLauncher";

export default function ProjectsView() {
  const navigate = useNavigate();

  return (
    <ProjectLauncher
      onNavigateToGenerator={() => navigate("/generator")}
    />
  );
}
