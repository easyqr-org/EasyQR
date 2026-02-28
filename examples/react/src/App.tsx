import EasyQRPanel from "./components/EasyQRPanel";

export default function App() {
  return (
    <EasyQRPanel
      config={{
        baseUrl: "http://localhost:3000",
        projectId: "demo_project",
        apiKey: "demo_key",
      }}
    />
  );
}
