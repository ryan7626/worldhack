import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";

async function testUpload() {
  const form = new FormData();
  // Try to create a dummy image buffer or file to upload
  // Since we need an actual image for sharp to process, let's create a minimal valid JPEG or use a dummy text file
  // Wait, sharp will fail if it's not a valid image. Let's create a 1x1 pixel JPEG.
  const dummyJpegBase64 = "/9j/4AAQSkZJRgABAgAAZABkAAD/7AARRHVja3kAAQAEAAAAMgAA/9sAQABAEAwODg4ODw4PEBASFxwZHBwcHCIoLiIsOj4+Pjs8Oj4+Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/P/8AAEQgAAQABAwERAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A9UooooA//9k=";
  
  const buffer = Buffer.from(dummyJpegBase64, 'base64');
  fs.writeFileSync('test.jpg', buffer);

  form.append('photos', fs.createReadStream('test.jpg'));

  try {
    const res = await fetch('http://localhost:3000/api/upload-photos', {
      method: 'POST',
      body: form
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch(e) {
    console.log("Error:", e);
  }
}

testUpload();
