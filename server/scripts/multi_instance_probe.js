const WebSocket = require('ws');

async function main() {
  const createRes = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: 'dev_project', apiKey: 'dev_key', context: { proof: 'multi-instance' } }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create session: ${createRes.status} ${text}`);
  }

  const session = await createRes.json();
  const sid = session.sessionId;
  const token = session.wsToken;
  const probeValue = `PROOF-${Date.now()}`;

  console.log('sessionId', sid);
  console.log('probeValue', probeValue);

  const hostUrl = `ws://localhost:3001/ws?token=${encodeURIComponent(token)}&role=HOST&sessionId=${encodeURIComponent(sid)}`;
  const mobileUrl = `ws://localhost:3000/ws?token=${encodeURIComponent(token)}&role=MOBILE&sessionId=${encodeURIComponent(sid)}`;

  const host = new WebSocket(hostUrl);
  let hostOpen = false;
  let scanReceived = false;
  let stateReceived = false;

  host.on('open', () => {
    hostOpen = true;
    console.log('host_open', true);
  });

  host.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    console.log('host_msg_type', msg.type);
    if (msg.type === 'SESSION_STATE') {
      stateReceived = true;
      console.log('host_state', msg.state);
    }
    if (msg.type === 'SCAN' && msg.payload && msg.payload.value === probeValue) {
      scanReceived = true;
      console.log('host_scan_received', msg.payload.value);
    }
  });

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      if (!hostOpen) return reject(new Error('host did not open in time'));
      resolve();
    }, 1500);
    host.on('open', () => { clearTimeout(t); resolve(); });
    host.on('error', (e) => { clearTimeout(t); reject(e); });
  });

  const mobile = new WebSocket(mobileUrl);
  mobile.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      console.log('mobile_msg_type', msg.type, msg.message || '');
    } catch {}
  });
  mobile.on('close', (code, reason) => {
    console.log('mobile_close', code, reason.toString());
  });
  mobile.on('error', (e) => {
    console.log('mobile_error', e.message || String(e));
  });

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('mobile did not open in time')), 2000);
    mobile.on('open', () => { clearTimeout(t); resolve(); });
    mobile.on('error', (e) => { clearTimeout(t); reject(e); });
  });

  await new Promise((r) => setTimeout(r, 700));

  mobile.send(JSON.stringify({
    type: 'SCAN',
    payload: {
      sessionId: sid,
      value: probeValue,
      format: 'CODE_128',
      timestamp: new Date().toISOString(),
      source: 'mobile',
    },
  }));

  await new Promise((r) => setTimeout(r, 3000));

  host.close();
  mobile.close();

  console.log('stateReceived', stateReceived);
  console.log('scanReceived', scanReceived);

  if (!scanReceived) {
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('probe_error', err.message || err);
  process.exit(1);
});
