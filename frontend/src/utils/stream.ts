
export function forEachStream<T>(it: AsyncIterator<T>, fn: (arg: T) => void, onDone: () => void) {
  const processNext = () => {
    it.next().then(({ value, done }) => {
      if (done) {
        if (onDone) {
          onDone();
        }
        return;
      }

      fn(value);
      processNext(); // recursively process next item
    });
  };

  processNext();
}

export function forEachStreamJson<T>(res: Response, fn: (arg: T) => void, onDone: () => void) {
  let it = streamJson(res);

  forEachStream(it, fn, onDone);
}

export async function* streamJson(res: Response) {
  let body = res.body;
  if (!body) {
    console.error("body was null!");
    return;
  }

  const reader = body.getReader();


  let decoder = new TextDecoder();
  let buffer = "";
  
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    

    buffer += decoder.decode(value, { stream: true });
    
    let parts = buffer.split("\0");
    buffer = parts.pop(); // last part may be incomplete, save for next loop
    
    for (let part of parts) {
      try {
        yield JSON.parse(part);
      } catch (err) {
        console.error("JSON parse error:", err);
      }
    }
  }
}

