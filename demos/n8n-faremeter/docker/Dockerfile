ARG N8N_VERSION=latest
FROM n8nio/n8n:${N8N_VERSION}

USER root

RUN mkdir -p /opt/n8n-custom-nodes

COPY dist /opt/n8n-custom-nodes/n8n-nodes-faremeter/dist
COPY icons /opt/n8n-custom-nodes/n8n-nodes-faremeter/icons
COPY package.json /opt/n8n-custom-nodes/n8n-nodes-faremeter/

WORKDIR /opt/n8n-custom-nodes/n8n-nodes-faremeter
RUN npm install --omit=dev

COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER node

WORKDIR /home/node

ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 5678
