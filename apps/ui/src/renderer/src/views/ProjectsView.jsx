import React from "react";
import { useNavigate } from "react-router-dom";
import { ProjectLauncher } from "../components/ProjectLauncher";

export default function ProjectsView() {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full overflow-auto p-6">
      <ProjectLauncher onNavigateToGenerator={() => navigate("/generator")} />
    </div>
  );
}
