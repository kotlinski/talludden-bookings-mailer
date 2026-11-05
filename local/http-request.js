/**
 * Helper for local/run.js: performs one HTTP request and prints the result as JSON.
 * Runs as a child process so UrlFetchApp.fetch can stay synchronous.
 * Redirects are followed manually so Set-Cookie headers from redirect responses aren't lost.
 */
async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const req = JSON.parse(Buffer.concat(chunks).toString('utf8'));

  let { url, method, headers, body } = req;
  const cookies = [];
  let res;

  for (let hop = 0; hop < 10; hop++) {
    res = await fetch(url, { method, headers, body, redirect: 'manual' });
    cookies.push(...res.headers.getSetCookie());

    const location = res.headers.get('location');
    if (!req.followRedirects || res.status < 300 || res.status >= 400 || !location) break;

    url = new URL(location, url).toString();
    if (res.status !== 307 && res.status !== 308) {
      method = 'GET';
      body = undefined;
    }
  }

  const responseHeaders = {};
  res.headers.forEach((value, key) => {
    if (key === 'set-cookie') return;
    // Apps Script returns header names in their usual capitalised form.
    responseHeaders[key.replace(/(^|-)([a-z])/g, (_, d, c) => d + c.toUpperCase())] = value;
  });
  if (cookies.length === 1) responseHeaders['Set-Cookie'] = cookies[0];
  else if (cookies.length > 1) responseHeaders['Set-Cookie'] = cookies;

  const bytes = Buffer.from(await res.arrayBuffer());
  process.stdout.write(JSON.stringify({
    status: res.status,
    headers: responseHeaders,
    bodyBase64: bytes.toString('base64'),
  }));
}

main().catch((err) => {
  process.stdout.write(JSON.stringify({ error: String(err && err.message || err) }));
});
