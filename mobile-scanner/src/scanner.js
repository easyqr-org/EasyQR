const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("statusText");
const scanResult = document.getElementById("scanResult");
const scannerBox = document.getElementById("scannerBox");

const codeReader = new ZXing.BrowserMultiFormatReader();

startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";
  scannerBox.classList.remove("hidden");
  statusText.innerText = "Requesting camera access...";

  try {
    await codeReader.decodeFromConstraints(
      {
        video: { facingMode: { ideal: "environment" } }
      },
      video,
      (result, err) => {
        if (result) {
          scanResult.innerText = result.text;
          statusText.innerText = "✅ Barcode detected";
          navigator.vibrate?.(100);

          // Stop scanning after success
          codeReader.reset();
        }
      }
    );

    statusText.innerText = "📷 Scanning...";
  } catch (err) {
    console.error(err);
    statusText.innerText = "❌ Camera permission denied";
  }
});
