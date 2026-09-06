const body=$json.body??$json;
const data=Array.isArray(body.data)?(body.data[0]??{}):(body.data??{});
const key=data.key??{};
const event=String(body.event??data.event??'').trim().toLowerCase();
const instance_name=String(body.instance??data.instanceName??data.instance??'').trim();
const instance_id=String(data.instanceId??body.instanceId??body.instance_id??'').trim();
const remote_jid=String(key.remoteJid??data.remoteJid??body.remoteJid??'').trim();
const from_me=Boolean(key.fromMe??data.fromMe??false);
const message_id=String(key.id??data.id??body.messageId??'').trim();
const push_name=String(data.pushName??body.pushName??'').trim();
const dry_run=body.dry_run===true||String(body.dry_run??'').toLowerCase()==='true';
const msg=data.message??{};
const message=String(
  msg.conversation??
  msg.extendedTextMessage?.text??
  msg.imageMessage?.caption??
  msg.videoMessage?.caption??
  msg.buttonsResponseMessage?.selectedDisplayText??
  msg.listResponseMessage?.title??
  msg.templateButtonReplyMessage?.selectedDisplayText??
  data.text??''
).trim();
const is_group=remote_jid.endsWith('@g.us');
const is_status=remote_jid==='status@broadcast';
const is_message_event=event==='messages.upsert'||event==='messages_upsert'||event==='messages-upsert';
const process=is_message_event&&!from_me&&!is_group&&!is_status&&Boolean(instance_id)&&Boolean(instance_name)&&Boolean(remote_jid)&&Boolean(message);
return [{json:{process,dry_run,event,instance_name,instance_id,remote_jid,from_me,is_group,is_status,message_id,push_name,message,raw_event:body}}];
