# 📱 EasyQR — Phase 2 · Task 2.1  
### Mobile Barcode Capture (Client-Side)


---

## 🚀 Overview

This task establishes the **mobile-side scanning foundation** for EasyQR.  
The focus is on **secure camera access**, **live video feed**, and **real-time barcode detection** using modern browser APIs.

> 🎯 Goal: Enable mobile devices to **open a web scanner**, access the camera, and prepare for QR/barcode decoding.

---

## ✅ What’s Completed

✔ Mobile-friendly scanning UI  
✔ Secure camera permission handling (HTTPS via ngrok)  
✔ Live rear-camera video feed (iOS & Android)  
✔ Scanning lifecycle state management  
✔ Professional UI feedback (`Waiting → Scanning`)  
✔ ZXing scanner integration wired correctly  
✔ Fully documented setup & execution flow  

---

## 🧠 Architecture Snapshot

```text
Mobile Browser
 └── index.html
      ├── styles.css
      └── scanner.js
           └── ZXing BrowserMultiFormatReader
                └── Camera Stream
```
🛠 Technologies Used<br>
HTML5 MediaDevices API

ZXing (Barcode & QR decoding)

Vanilla JavaScript

Mobile-first CSS

ngrok (HTTPS tunneling)

📸 Visual Proof
🔹 Desktop (ngrok + Server)
📌 Demonstrates:
Local server running
HTTPS tunnel active
Public URL exposed
⬇
![Desktop Setup](assets/Phase2/ngrok-setup.gif)
🔹 Mobile (iPhone Scanner UI)
📌 Demonstrates:
Camera permission
Live video feed
Scanning state
⬇️
![Mobile Scanner](assets/phase2/mobile-scan.gif)
🧪 Testing Performed<br>
iOS Safari (iPhone)<br>
Android Chrome<br>
Rear camera detection<br>
HTTPS permission validation<br>
Multiple QR & barcode formats tested<br>
⚠️ Known Limitations (Intentional)<br>
❌ Decoding accuracy tuning pending<br>
❌ Scan result stabilization pending<br>
❌ Backend streaming not yet connected<br>
These are intentionally deferred to the next task.<br>
🧱 Scope Boundary<br>
Included in Task 2.1<br>
✔ Camera access<br>
✔ Video feed<br>
✔ Scanner pipeline<br>
✔ UI + Documentation<br>
Excluded<br>
🚫 Scan result validation<br>
🚫 Real-time streaming<br>
🚫 Desktop synchronization<br>

🔮 What’s Next — Task 2.2<br>
Reliable QR / barcode decoding<br>
Result stabilization & throttling<br>
Real-time scan result handling<br>
Desktop sync preparation<br>

🏁 Status
🟢 Task 2.1 Completed<br>
Foundation is solid, extensible, and production-aligned.
This phase proves the system can safely access and control mobile cameras — the hardest part.
<p align="center"> <strong>Step by Step 🚀</strong> </p> 