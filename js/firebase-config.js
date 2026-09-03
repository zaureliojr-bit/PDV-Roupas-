// Configuração do Firebase deste comércio. Preencha com os dados do SEU
// projeto (gratuito) criado em https://console.firebase.google.com:
//
//   1. Crie um projeto → adicione um "app da Web" (ícone </>).
//   2. Copie o objeto de configuração que aparece e cole nos campos abaixo.
//   3. No menu lateral, abra "Firestore Database" → "Criar banco de dados"
//      (modo produção, qualquer região).
//   4. No menu lateral, abra "Authentication" → aba "Sign-in method" →
//      ative o provedor "Anônimo".
//   5. Ainda em Firestore, na aba "Regras", cole:
//
//        rules_version = '2';
//        service cloud.firestore {
//          match /databases/{database}/documents {
//            match /{document=**} {
//              allow read, write: if request.auth != null;
//            }
//          }
//        }
//
// Sem isso preenchido, o app fica preso na tela de PIN (erro de conexão).

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCktwlYy2T-BseT4F4MCLI5vcfwxy9qqF0',
  authDomain: 'pdv-roupas-874c1.firebaseapp.com',
  projectId: 'pdv-roupas-874c1',
  storageBucket: 'pdv-roupas-874c1.firebasestorage.app',
  messagingSenderId: '469082777865',
  appId: '1:469082777865:web:bf375fd4d9fe1f8ef98bd8'
};

// PIN de acesso compartilhado da loja. Troque para o que preferir — é o
// mesmo PIN que todos os aparelhos da equipe vão digitar para entrar.
// Aviso: isso é só uma barreira simples contra acesso casual (quem tem o
// link mas não o PIN não abre o app). Não é uma senha individual por
// vendedor nem uma proteção contra alguém tecnicamente sofisticado —
// para isso seria necessário um backend próprio com login de verdade.
const APP_PIN = '1234';
