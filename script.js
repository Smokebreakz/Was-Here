window.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://pybfxqhawsvvhbmkxeij.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YmZ4cWhhd3N2dmhibWt4ZWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MDE3ODEsImV4cCI6MjA2NjQ3Nzc4MX0.MGZ4DdUSLcEJGhnmnTrXq7kDbLaaskwb9Cy8ne57FqU';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const nameInput = document.getElementById('nameInput');
  const submitBtn = document.getElementById('submitBtn');
  const feedback = document.getElementById('feedback');
  const nameList = document.getElementById('nameList');
  const canvas = document.getElementById('doodleCanvas');
  const clearBtn = document.getElementById('clearCanvas');
  const ctx = canvas.getContext('2d');

  let isDrawing = false;
  let currentColor = '#265941';

  function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: x - rect.left, y: y - rect.top };
  }

  function startDrawing(e) {
    isDrawing = true;
    ctx.beginPath();
    const pos = getPosition(e);
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault();
  }

  function draw(e) {
    if (!isDrawing) return;
    const pos = getPosition(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    e.preventDefault();
  }

  function stopDrawing(e) {
    isDrawing = false;
    e.preventDefault();
  }

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight * 0.6;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);
  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing, { passive: false });
  canvas.addEventListener('touchcancel', stopDrawing, { passive: false });

  clearBtn.addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) {
        feedback.textContent = 'Please type a name first!';
        return;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          feedback.textContent = '❌ Could not convert drawing to image.';
          return;
        }

        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

        const { error: uploadError } = await supabase
          .storage
          .from('doodles')
          .upload(filename, blob, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          feedback.textContent = `❌ Upload failed: ${uploadError.message}`;
          console.error(uploadError);
          return;
        }

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/doodles/${filename}`;

        const { error: dbError } = await supabase
          .from('drawings')
          .insert([{ image: name, image_url: publicUrl }]);

        if (dbError) {
          feedback.textContent = `❌ Submission failed: ${dbError.message}`;
        } else {
          feedback.textContent = `✅ Your doodle was submitted!`;
          nameInput.value = '';
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          loadDrawings();
        }
      }, 'image/png');
    });
  }

  async function loadDrawings() {
    const { data, error } = await supabase
      .from('drawings')
      .select('image_url')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Could not load drawings:', error.message);
      return;
    }

    nameList.innerHTML = '';
    nameList.style.position = 'relative';
    nameList.style.overflow = 'visible';
    nameList.style.padding = '0';
    nameList.style.display = 'block';

    let maxBottom = 0;

    data.forEach((entry, i) => {
      if (entry.image_url) {
        const img = document.createElement('img');
        const width = 160 + Math.random() * 80;
        const maxLeft = window.innerWidth - width - 20;
        const left = Math.max(0, Math.random() * maxLeft);

        img.src = entry.image_url;
        img.style.position = 'absolute';
        img.style.width = `${width}px`;
        img.style.opacity = '0.95';
        img.style.left = `${left}px`;
        const top = i * 50 + Math.random() * 20;
        img.style.top = `${top}px`;
        img.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
        img.style.zIndex = Math.floor(Math.random() * 10);
        nameList.appendChild(img);

        const bottom = top + (parseFloat(img.style.height) || width); // assume square if no height yet
        if (bottom > maxBottom) maxBottom = bottom;
      }
    });

    nameList.style.height = `${maxBottom + 200}px`; // more padding to enable scroll
    document.body.style.height = `${maxBottom + 300}px`; // extend body height too
    document.body.style.overflowY = 'scroll';
  }

  loadDrawings();

  const colorOptions = ['#265941', '#979a04', '#a2a2ff', '#e61e27'];
  const pickerContainer = document.createElement('div');
  pickerContainer.id = 'colorPickerContainer';
  pickerContainer.style.display = 'flex';
  pickerContainer.style.justifyContent = 'center';
  pickerContainer.style.margin = '10px 0';

  colorOptions.forEach(color => {
    const btn = document.createElement('button');
    btn.style.backgroundColor = color;
    btn.style.width = '30px';
    btn.style.height = '30px';
    btn.style.margin = '5px';
    btn.style.border = '2px solid #fcfadc';
    btn.style.borderRadius = '50%';
    btn.style.cursor = 'pointer';
    btn.title = color;
    btn.addEventListener('click', () => {
      currentColor = color;
    });
    pickerContainer.appendChild(btn);
  });

  if (canvas && canvas.parentNode) {
    canvas.parentNode.insertBefore(pickerContainer, canvas);
  } else {
    document.body.appendChild(pickerContainer);
  }
});

