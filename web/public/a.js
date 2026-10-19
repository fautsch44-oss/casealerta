
(function(){var f=document.getElementById('lk');if(!f)return;var r=document.getElementById('res'),es=CA.lang==='es';
f.addEventListener('submit',async function(e){e.preventDefault();var v=document.getElementById('rcpt').value.replace(/[\s-]/g,'').toUpperCase();
if(!/^([A-Z]{3}[0-9]{10}|[A-Z]{3}\*[0-9]{9})$/.test(v)){r.className='result on';r.innerHTML='<p class="err">'+(es?'Son 3 letras y 10 números, por ejemplo IOE0912345678.':'It is 3 letters and 10 digits, e.g. IOE0912345678.')+'</p>';return;}
r.className='result on';r.innerHTML='<p>'+(es?'Consultando a USCIS…':'Checking with USCIS…')+'</p>';
try{var x=await fetch(CA.fn,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+CA.k,apikey:CA.k},body:JSON.stringify({receipt_number:v})});var j=await x.json();
if(!x.ok||!j.ok){r.innerHTML='<p class="err">'+(j.message_es&&es?j.message_es:(j.message||'Error'))+'</p>';return;}
var c=j.case,t=es?(c.status_es||c.status_en):c.status_en,d=es?(c.desc_es||c.desc_en):c.desc_en;
var div=document.createElement('div');div.className='res-box';var a=document.createElement('b');a.textContent=(c.form_type||'')+' · '+v;var h=document.createElement('h3');h.textContent=t||'';var p=document.createElement('p');p.textContent=d||'';
div.appendChild(a);div.appendChild(h);div.appendChild(p);r.innerHTML='';r.appendChild(div);}
catch(err){r.innerHTML='<p class="err">'+(es?'No pudimos conectar. Intenta de nuevo.':'Could not connect. Try again.')+'</p>';}});})();
