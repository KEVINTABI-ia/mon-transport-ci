'use strict';
(function(){
var $=function(id){return document.getElementById(id)};
var user=function(){return window.auth&&window.auth.currentUser};
var db=function(){return window.db};
var esc=function(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;')};
var today=function(){var d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
var tomorrow=function(){var d=new Date();d.setDate(d.getDate()+1);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
var trips=[];
function msg(t,bad){var e=$('mqciTPStatus');if(e){e.textContent=t;e.style.color=bad?'#a12b2b':'#17663d'}}
function login(){if(!user()){msg('Connectez-vous pour utiliser Trajet partagé.',true);return false}return true}
function tab(t){['Passager','Conducteur','Reservations','Admin'].forEach(function(n){var e=$('mqciTP'+n);if(e)e.hidden=n.toLowerCase()!==t});if(t==='conducteur')profile();if(t==='reservations')bookings();if(t==='admin')loadPending()}
function init(){var host=$('rechercheGaresV2');if(!host||$('mqciTrajetPartage'))return;var s=document.createElement('section');s.id='mqciTrajetPartage';s.className='card';s.style.cssText='margin-top:18px;padding:16px;border:1px solid #d9e8dd;border-top:4px solid #16834A;border-radius:18px;background:#fff';
s.innerHTML='<h2>🚗 Trajet partagé</h2><p class="notice">Trouvez un conducteur allant dans votre direction ou publiez votre trajet.</p><div class="modes"><button type="button" class="mode" data-tab="passager">Trouver un trajet</button><button type="button" class="mode" data-tab="conducteur">Espace conducteur</button><button type="button" class="mode" data-tab="reservations">Mes réservations</button><button type="button" class="mode" data-tab="admin" id="mqciTPAdminTab" hidden>Administration</button></div>'+
'<div id="mqciTPPassager"><label>Commune de départ</label><input id="mqciTPDepart" maxlength="80" placeholder="Ex. Yopougon"><label>Destination</label><input id="mqciTPDestination" maxlength="80" placeholder="Ex. Plateau"><label>Date du trajet</label><input id="mqciTPDate" type="date" min="'+today()+'" value="'+tomorrow()+'"><label>Heure souhaitée</label><input id="mqciTPHeure" type="time" value="07:00"><button id="mqciTPChercher" type="button" class="primary">Rechercher les conducteurs</button><div id="mqciTPResultats"></div></div>'+
'<div id="mqciTPConducteur" hidden><div id="mqciTPProfil"></div><form id="mqciTPProfilForm"><h3>Créer mon profil conducteur</h3><label>Nom affiché</label><input id="mqciTPNom" maxlength="100" required><label>Téléphone</label><input id="mqciTPTel" type="tel" maxlength="24" required><label>Catégorie</label><select id="mqciTPType"><option value="particulier">Particulier avec véhicule</option><option value="entreprise">Conducteur d’entreprise partenaire</option></select><p class="notice">Joignez votre permis, la carte grise et l’assurance. Les justificatifs sont privés et accessibles uniquement à l’administration.</p><label>Permis (image ou PDF)</label><input id="mqciTPPermis" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required><label>Carte grise (image ou PDF)</label><input id="mqciTPCarteGrise" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required><label>Assurance (image ou PDF)</label><input id="mqciTPAssurance" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required><button class="primary">Soumettre mon profil</button></form>'+
'<form id="mqciTPTrajetForm" hidden><h3>Publier un trajet</h3><label>Départ</label><input id="mqciTPPubDepart" maxlength="80" required><label>Destination</label><input id="mqciTPPubDestination" maxlength="80" required><label>Date du départ</label><input id="mqciTPPubDate" type="date" min="'+today()+'" required><label>Heure</label><input id="mqciTPPubHeure" type="time" required><label>Point de rencontre</label><input id="mqciTPPoint" maxlength="120" required><label>Places disponibles</label><select id="mqciTPPlaces"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option></select><label>Tarif par passager (FCFA)</label><input id="mqciTPTarif" type="number" min="100" max="100000" required><p class="notice">Le tarif est fixé par le conducteur et accepté par le passager. Paiement intégré non activé dans cette version.</p><button class="primary">Publier mon trajet</button></form></div>'+
'<div id="mqciTPReservations" hidden><div id="mqciTPMesReservations"></div></div><div id="mqciTPAdmin" hidden><h3>Dossiers conducteurs à vérifier</h3><div id="mqciTPPending"></div></div><p id="mqciTPStatus" class="notice" role="status" aria-live="polite"></p>';host.appendChild(s);
s.querySelectorAll('[data-tab]').forEach(function(b){b.addEventListener('click',function(){tab(b.dataset.tab)})});$('mqciTPChercher').onclick=search;$('mqciTPProfilForm').onsubmit=saveProfile;$('mqciTPTrajetForm').onsubmit=publish;if(window.auth&&auth.onAuthStateChanged)auth.onAuthStateChanged(function(){ $('mqciTPAdminTab').hidden=!(user()&&user().uid==='3LpoTLyQdtVcdtnSMAJFc7Cvnpz2');profile()});$('mqciTPAdminTab').hidden=!(user()&&user().uid==='3LpoTLyQdtVcdtnSMAJFc7Cvnpz2');profile()}
function profile(){if(!user()||!db())return;db().collection('trajet_partage_profils').doc(user().uid).get().then(function(s){var p=s.exists?s.data():null;$('mqciTPProfil').textContent=p?'Statut du profil : '+p.statutVerification:'Aucun profil conducteur.';$('mqciTPProfilForm').hidden=!!p;$('mqciTPTrajetForm').hidden=!(p&&p.statutVerification==='approuve')}).catch(function(){msg('Impossible de charger votre profil.',true)})}
function saveProfile(e){
 e.preventDefault();if(!login()||!db()||!storage())return;
 var nom=$('mqciTPNom').value.trim(),tel=$('mqciTPTel').value.trim();
 var entries=[['permis','mqciTPPermis'],['carteGrise','mqciTPCarteGrise'],['assurance','mqciTPAssurance']];
 if(nom.length<2||tel.length<8||entries.some(function(x){return !$ (x[1]).files[0]})){msg('Complétez vos coordonnées et les trois justificatifs.',true);return}
 var uid=user().uid,docs={permis:true,carteGrise:true,assurance:true};
 var uploads=entries.map(function(x){
  var file=$(x[1]).files[0];
  if(file.size>8*1024*1024||!(/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)))throw Error('Fichier non autorisé ou supérieur à 8 Mo');
  var ext=file.type==='application/pdf'?'pdf':file.type.split('/')[1];
  return storage().ref('trajet_partage_documents/'+uid+'/'+x[0]+'.'+ext).put(file,{contentType:file.type});
 });
 Promise.all(uploads).then(function(){
  return db().collection('trajet_partage_profils').doc(uid).set({
   uid:uid,nom:nom,telephone:tel,categorie:$('mqciTPType').value,
   statutVerification:'en_attente',documents:docs,
   createdAt:firebase.firestore.FieldValue.serverTimestamp(),
   updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  });
 }).then(function(){msg('Dossier et trois justificatifs transmis. Votre profil est en attente de vérification.');profile()})
 .catch(function(err){msg(err&&err.message==='Fichier non autorisé ou supérieur à 8 Mo'?err.message:'Envoi incomplet. Vérifiez votre connexion et contactez le support.',true)});
}
function publish(e){e.preventDefault();if(!login()||!db())return;var date=$('mqciTPPubDate').value,time=$('mqciTPPubHeure').value,dt=new Date(date+'T'+time+':00'),price=Number($('mqciTPTarif').value),places=Number($('mqciTPPlaces').value);if(!date||!time||dt<=new Date()||!Number.isInteger(price)||price<100){msg('Vérifiez la date, l’heure et le tarif.',true);return}db().collection('trajet_partage_profils').doc(user().uid).get().then(function(p){if(!p.exists||p.data().statutVerification!=='approuve')throw Error('Profil non vérifié');return db().collection('trajets_partages').add({conducteurUid:user().uid,conducteurNom:p.data().nom,depart:$('mqciTPPubDepart').value.trim(),destination:$('mqciTPPubDestination').value.trim(),dateTrajet:firebase.firestore.Timestamp.fromDate(dt),heureDepart:time,pointRencontre:$('mqciTPPoint').value.trim(),placesDisponibles:places,tarifParPlace:price,statut:'publie',createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()})}).then(function(){msg('Trajet publié. Les passagers peuvent réserver.');$('mqciTPTrajetForm').reset()}).catch(function(){msg('Publication impossible : vérifiez votre profil et les champs.',true)})}
function search(){if(!db())return;var a=$('mqciTPDepart').value.trim().toLowerCase(),b=$('mqciTPDestination').value.trim().toLowerCase(),d=$('mqciTPDate').value;if(!a||!b||!d){msg('Renseignez le départ, la destination et la date.',true);return}var start=new Date(d+'T00:00:00'),end=new Date(d+'T23:59:59');$('mqciTPResultats').textContent='Recherche…';db().collection('trajets_partages').where('statut','==','publie').where('dateTrajet','>=',firebase.firestore.Timestamp.fromDate(start)).where('dateTrajet','<=',firebase.firestore.Timestamp.fromDate(end)).limit(100).get().then(function(s){trips=s.docs.map(function(x){return Object.assign({id:x.id},x.data())}).filter(function(t){return t.placesDisponibles>0&&t.depart.toLowerCase().indexOf(a)>=0&&t.destination.toLowerCase().indexOf(b)>=0});if(!trips.length){$('mqciTPResultats').textContent='Aucun conducteur disponible pour ces critères.';return}$('mqciTPResultats').innerHTML=trips.map(function(t){return '<article style="border:1px solid #e1e9e2;border-radius:12px;padding:12px;margin-top:10px"><strong>'+esc(t.depart)+' → '+esc(t.destination)+'</strong><p>'+esc(t.dateTrajet.toDate().toLocaleDateString('fr-FR'))+' · '+esc(t.heureDepart)+'<br>Rencontre : '+esc(t.pointRencontre)+'<br>'+esc(t.conducteurNom)+' · '+esc(t.placesDisponibles)+' place(s)</p><strong>'+Number(t.tarifParPlace).toLocaleString('fr-FR')+' FCFA / place</strong><p><button type="button" data-book="'+esc(t.id)+'">Demander une place</button></p></article>'}).join('');$('mqciTPResultats').querySelectorAll('[data-book]').forEach(function(x){x.onclick=function(){book(x.dataset.book)}})}).catch(function(){ $('mqciTPResultats').textContent='Recherche impossible. Un index Firestore peut être nécessaire.'})}
function book(id){if(!login()||!db())return;var t=trips.find(function(x){return x.id===id});if(!t)return;var point=prompt('Point de rencontre souhaité :',t.pointRencontre);if(point===null)return;db().collection('reservations_trajets').doc(id+'_'+user().uid).set({trajetId:id,conducteurUid:t.conducteurUid,passagerUid:user().uid,passagerNom:user().displayName||user().email||'Passager',dateTrajet:t.dateTrajet,heureDepart:t.heureDepart,depart:t.depart,destination:t.destination,pointRencontre:point.trim()||t.pointRencontre,tarifParPlace:t.tarifParPlace,places:1,statut:'en_attente',createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()}).then(function(){msg('Demande envoyée. Elle sera confirmée après acceptation du conducteur.')}).catch(function(){msg('Réservation impossible : le trajet n’est peut-être plus disponible.',true)})}
function bookings(){if(!login()||!db())return;var box=$('mqciTPMesReservations');box.textContent='Chargement…';Promise.all([db().collection('reservations_trajets').where('passagerUid','==',user().uid).limit(50).get(),db().collection('reservations_trajets').where('conducteurUid','==',user().uid).limit(50).get()]).then(function(ss){var all=[];ss.forEach(function(s){s.docs.forEach(function(d){all.push(Object.assign({id:d.id},d.data()))})});box.innerHTML=all.length?all.map(function(x){return '<article style="border:1px solid #ddd;padding:10px;margin:8px 0;border-radius:10px"><strong>'+esc(x.depart)+' → '+esc(x.destination)+'</strong><p>'+esc(x.dateTrajet.toDate().toLocaleDateString('fr-FR'))+' · '+esc(x.heureDepart)+' · '+esc(x.statut)+'</p>'+(x.conducteurUid===user().uid&&x.statut==='en_attente'?'<button data-ok="'+x.id+'">Accepter</button> <button data-no="'+x.id+'">Refuser</button>':'')+'</article>'}).join(''):'Aucune réservation.';box.querySelectorAll('[data-ok]').forEach(function(b){b.onclick=function(){decide(b.dataset.ok,'acceptee')}});box.querySelectorAll('[data-no]').forEach(function(b){b.onclick=function(){decide(b.dataset.no,'refusee')}})}).catch(function(){box.textContent='Impossible de charger les réservations.'})}
function decide(id,state){
 if(!login()||!db())return;
 var bookingRef=db().collection('reservations_trajets').doc(id);
 db().runTransaction(function(tx){
  return tx.get(bookingRef).then(function(bSnap){
   if(!bSnap.exists)throw Error('Demande introuvable');var b=bSnap.data();
   if(b.conducteurUid!==user().uid||b.statut!=='en_attente')throw Error('Cette demande n’est plus en attente.');
   if(state==='refusee'){tx.update(bookingRef,{statut:'refusee',updatedAt:firebase.firestore.FieldValue.serverTimestamp()});return}
   var tripRef=db().collection('trajets_partages').doc(b.trajetId);
   return tx.get(tripRef).then(function(tSnap){
    if(!tSnap.exists)throw Error('Trajet introuvable');var t=tSnap.data();
    if(t.conducteurUid!==user().uid||t.statut!=='publie'||t.placesDisponibles<1)throw Error('Il n’y a plus de place disponible.');
    var remaining=t.placesDisponibles-1;
    tx.update(tripRef,{placesDisponibles:remaining,statut:remaining===0?'complet':'publie',updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    tx.update(bookingRef,{statut:'acceptee',updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
   });
  });
 }).then(function(){msg(state==='acceptee'?'Réservation confirmée et place bloquée.':'Demande refusée.');bookings()})
 .catch(function(err){msg(err&&err.message?err.message:'Impossible de traiter la demande.',true)});
}

function loadPending(){
 if(!user()||user().uid!=='3LpoTLyQdtVcdtnSMAJFc7Cvnpz2'||!db())return;
 var box=$('mqciTPPending');box.textContent='Chargement des dossiers…';
 db().collection('trajet_partage_profils').where('statutVerification','==','en_attente').limit(50).get().then(function(s){
  if(!s.size){box.textContent='Aucun dossier en attente.';return}
  box.innerHTML=s.docs.map(function(d){var p=d.data();return '<article style="border:1px solid #ddd;border-radius:12px;padding:12px;margin:10px 0"><strong>'+esc(p.nom)+'</strong><p>'+esc(p.telephone)+' · '+esc(p.categorie)+'</p><div data-docs="'+esc(d.id)+'"></div><button type="button" data-approve="'+esc(d.id)+'">Valider le conducteur</button> <button type="button" data-reject="'+esc(d.id)+'">Refuser le dossier</button></article>'}).join('');
  s.docs.forEach(function(d){var p=d.data(),zone=box.querySelector('[data-docs="'+d.id+'"]');['permis','carteGrise','assurance'].forEach(function(k){var line=document.createElement('p');line.textContent=k+': '+(p.documents&&p.documents[k]?'déposé':'manquant');zone.appendChild(line);if(p.documents&&p.documents[k]){var link=document.createElement('button');link.type='button';link.textContent='Charger '+k;link.onclick=function(){openDocument(d.id,k,zone)};zone.appendChild(link)}})});
  box.querySelectorAll('[data-approve]').forEach(function(b){b.onclick=function(){review(b.dataset.approve,'approuve')}});
  box.querySelectorAll('[data-reject]').forEach(function(b){b.onclick=function(){review(b.dataset.reject,'refuse')}});
 }).catch(function(){box.textContent='Impossible de charger les dossiers. Vérifiez les droits administrateur.'});
}
function openDocument(uid,kind,zone){
 if(!user()||user().uid!=='3LpoTLyQdtVcdtnSMAJFc7Cvnpz2'||!window.storage)return;
 var extensions=['jpg','jpeg','png','webp','pdf'],tries=Promise.reject();
 extensions.forEach(function(ext){tries=tries.catch(function(){return storage().ref('trajet_partage_documents/'+uid+'/'+kind+'.'+ext).getBytes(8*1024*1024)})});
 tries.then(function(bytes){var url=URL.createObjectURL(new Blob([bytes]));var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent='Ouvrir le justificatif '+kind;a.style.display='block';zone.appendChild(a)}).catch(function(){msg('Document non accessible ou absent.',true)});
}
function review(uid,state){
 if(!user()||user().uid!=='3LpoTLyQdtVcdtnSMAJFc7Cvnpz2'||!db())return;
 db().collection('trajet_partage_profils').doc(uid).update({statutVerification:state,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}).then(function(){msg(state==='approuve'?'Conducteur validé.':'Dossier refusé.');loadPending()}).catch(function(){msg('Mise à jour du dossier impossible.',true)});
}

function start(){if(document.getElementById('rechercheGaresV2'))init()}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();