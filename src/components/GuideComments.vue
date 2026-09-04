<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import IconRenderer from './IconRenderer.vue';

interface CommentReaction {
  good: number;
  neutral: number;
  bad: number;
  userReaction?: 'good' | 'neutral' | 'bad' | null;
}

interface CommentItem {
  id: string;
  guideId: string;
  parentId: string | null;
  author: string;
  authorAvatar?: string | null;
  authorRole?: string | null;
  content: string;
  createdAt: string;
  reactions: CommentReaction;
  userReaction?: 'good' | 'neutral' | 'bad' | null;
}

const props = defineProps<{
  guideId: string;
  guideAuthor: string;
  currentUsername: string | null;
  currentUserRole?: string | null;
  isAdmin?: boolean;
}>();

const emit = defineEmits<{
  (e: 'require-auth'): void;
}>();

const comments = ref<CommentItem[]>([]);
const isLoading = ref<boolean>(false);
const newCommentText = ref<string>('');
const replyingToId = ref<string | null>(null);
const replyText = ref<string>('');
const isSubmitting = ref<boolean>(false);

const fetchComments = async () => {
  if (!props.guideId) return;
  isLoading.value = true;
  try {
    const url = `/api/guides/${props.guideId}/comments${props.currentUsername ? `?username=${encodeURIComponent(props.currentUsername)}` : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      comments.value = await res.json();
    }
  } catch (err) {
    console.error('Ошибка загрузки комментариев:', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchComments();
});

watch(() => [props.guideId, props.currentUsername], () => {
  fetchComments();
});

const rootComments = computed(() => {
  return comments.value.filter(c => !c.parentId);
});

const getReplies = (parentId: string) => {
  return comments.value.filter(c => c.parentId === parentId);
};

const handlePostComment = async (parentId: string | null = null) => {
  if (!props.currentUsername) {
    emit('require-auth');
    return;
  }

  const text = parentId ? replyText.value.trim() : newCommentText.value.trim();
  if (!text) return;

  isSubmitting.value = true;
  try {
    const res = await fetch(`/api/guides/${props.guideId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: props.currentUsername,
        authorRole: props.currentUserRole || 'author',
        content: text,
        parentId: parentId || undefined
      })
    });

    if (res.ok) {
      if (parentId) {
        replyText.value = '';
        replyingToId.value = null;
      } else {
        newCommentText.value = '';
      }
      await fetchComments();
    }
  } catch (err) {
    console.error('Ошибка отправки комментария:', err);
  } finally {
    isSubmitting.value = false;
  }
};

const handleReaction = async (commentId: string, reactionType: 'good' | 'neutral' | 'bad') => {
  if (!props.currentUsername) {
    emit('require-auth');
    return;
  }

  try {
    const res = await fetch(`/api/comments/${commentId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: props.currentUsername,
        reactionType
      })
    });

    if (res.ok) {
      await fetchComments();
    }
  } catch (err) {
    console.error('Ошибка реакции:', err);
  }
};

const handleDeleteComment = async (commentId: string) => {
  if (!confirm('Вы действительно хотите удалить этот комментарий?')) return;

  try {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      await fetchComments();
    }
  } catch (err) {
    console.error('Ошибка удаления комментария:', err);
  }
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

const canDelete = (comment: CommentItem) => {
  if (!props.currentUsername) return false;
  if (props.isAdmin) return true;
  if (props.currentUsername.toLowerCase() === props.guideAuthor.toLowerCase()) return true;
  if (props.currentUsername.toLowerCase() === comment.author.toLowerCase()) return true;
  return false;
};
const MAX_CHAR_LIMIT = 200;
</script>

<template>
  <div class="mt-12 pt-8 border-t border-[#26292d]/80 w-full max-w-full">
    <!-- Header with Counter Badge -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
          <IconRenderer name="MessageSquare" size="20" />
        </div>
        <div>
          <h3 class="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Обсуждение гайда
            <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
              {{ comments.length }}
            </span>
          </h3>
          <p class="text-xs text-dark-muted">Вопросы, советы и ответы от читателей и авторов</p>
        </div>
      </div>
    </div>

    <!-- Main Write Comment Card (Sleek Glassmorphism) -->
    <div class="mb-8 p-5 rounded-2xl border border-[#26292d] bg-[#141619] shadow-xl relative overflow-hidden group/input">
      <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover/input:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div v-if="currentUsername" class="flex flex-col gap-3 relative z-10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-cyan-500/30">
              {{ currentUsername.charAt(0).toUpperCase() }}
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-bold text-slate-200">{{ currentUsername }}</span>
              <span class="text-[10px] text-cyan-400/80 font-mono">Оставить комментарий</span>
            </div>
          </div>
        </div>

        <textarea 
          v-model="newCommentText"
          :maxlength="MAX_CHAR_LIMIT"
          placeholder="Напишите ваш комментарий, задайте вопрос или поделитесь советом..."
          rows="3"
          class="w-full p-3.5 text-xs sm:text-sm rounded-xl bg-[#0c0d0e] border border-[#26292d] text-white placeholder-dark-muted focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-y"
        ></textarea>

        <div class="flex items-center justify-between">
          <span :class="['text-[11px] font-mono transition-colors', newCommentText.length >= MAX_CHAR_LIMIT ? 'text-rose-400 font-bold' : 'text-dark-muted']">
            {{ newCommentText.length }} / {{ MAX_CHAR_LIMIT }} символов
          </span>
          <button 
            @click="handlePostComment(null)"
            :disabled="!newCommentText.trim() || newCommentText.length > MAX_CHAR_LIMIT || isSubmitting"
            class="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-950/50"
          >
            <IconRenderer name="Send" size="14" />
            <span>Опубликовать</span>
          </button>
        </div>
      </div>

      <div v-else class="text-center py-6 relative z-10 flex flex-col items-center gap-3">
        <div class="p-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-1">
          <IconRenderer name="User" size="24" />
        </div>
        <p class="text-xs text-slate-300 max-w-sm">Авторизуйтесь через аккаунт Cubix, чтобы присоединиться к обсуждению гайда</p>
        <button 
          @click="emit('require-auth')"
          class="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all shadow-lg shadow-cyan-950/60"
        >
          <IconRenderer name="LogIn" size="15" />
          <span>Войти через Cubix</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-10 text-dark-muted text-xs flex items-center justify-center gap-2 animate-pulse">
      <IconRenderer name="Loader2" size="16" class="animate-spin text-cyan-400" />
      <span>Загрузка комментариев...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="rootComments.length === 0" class="text-center py-12 px-4 rounded-2xl border border-dashed border-[#26292d] bg-[#121417]/50 text-dark-muted text-xs flex flex-col items-center gap-2">
      <IconRenderer name="MessageSquare" size="28" class="text-dark-muted/50 mb-1" />
      <span class="font-bold text-slate-300">Комментариев пока нет</span>
      <span>Будьте первым, кто задаст вопрос или оставит отзыв к этому гайду!</span>
    </div>

    <!-- Comments List -->
    <div v-else class="space-y-4">
      <div v-for="comment in rootComments" :key="comment.id" class="flex flex-col gap-2">
        <!-- Root Comment Card -->
        <div class="p-4 sm:p-5 rounded-2xl border border-[#26292d] bg-[#16181a] shadow-lg transition-all hover:border-[#32363e] group/card">
          <!-- Top Row: Author & Badges & Actions -->
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2.5 flex-wrap">
              <!-- Avatar -->
              <img 
                v-if="comment.authorAvatar" 
                :src="comment.authorAvatar" 
                class="w-8 h-8 rounded-xl object-cover border border-[#26292d] shadow-sm" 
              />
              <div v-else class="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 border border-[#26292d] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {{ comment.author.charAt(0).toUpperCase() }}
              </div>

              <!-- Author Name -->
              <span class="text-xs sm:text-sm font-bold text-white tracking-tight">{{ comment.author }}</span>

              <!-- Role Badges -->
              <span 
                v-if="comment.author.toLowerCase() === guideAuthor.toLowerCase()"
                class="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"
              >
                <IconRenderer name="CheckCircle2" size="11" />
                Автор гайда
              </span>
              <span 
                v-else-if="comment.authorRole === 'dark_core_team' || comment.authorRole === 'admin'"
                class="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1"
              >
                <IconRenderer name="ShieldCheck" size="11" />
                DarkCore Team
              </span>
              <span 
                v-else-if="comment.authorRole === 'moderator'"
                class="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1"
              >
                <IconRenderer name="Shield" size="11" />
                Модератор
              </span>

              <!-- Time -->
              <span class="text-[11px] text-dark-muted font-mono ml-auto sm:ml-0">{{ formatDate(comment.createdAt) }}</span>
            </div>

            <!-- Delete Button -->
            <button 
              v-if="canDelete(comment)" 
              @click="handleDeleteComment(comment.id)"
              title="Удалить комментарий"
              class="p-1.5 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
            >
              <IconRenderer name="Trash2" size="14" />
            </button>
          </div>

          <!-- Comment Text -->
          <p class="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed mb-4 pl-0 sm:pl-10">
            {{ comment.content }}
          </p>

          <!-- Footer Actions & 3-Tier Reactions -->
          <div class="flex items-center justify-between gap-3 pt-3 border-t border-[#26292d]/70 text-xs pl-0 sm:pl-10">
            <!-- 3-Tier Reactions (Good 👍 / Neutral 😐 / Bad 👎) -->
            <div class="flex items-center gap-2">
              <!-- Good (👍) -->
              <button 
                @click="handleReaction(comment.id, 'good')"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border',
                  comment.userReaction === 'good' 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950/50' 
                    : 'bg-[#0c0d0e] hover:bg-[#121416] text-dark-muted hover:text-slate-200 border-[#26292d]'
                ]"
                title="Полезно / Отличный совет"
              >
                <span>👍</span>
                <span class="font-mono">{{ comment.reactions.good || 0 }}</span>
              </button>

              <!-- Neutral (😐) -->
              <button 
                @click="handleReaction(comment.id, 'neutral')"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border',
                  comment.userReaction === 'neutral' 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-sm shadow-blue-950/50' 
                    : 'bg-[#0c0d0e] hover:bg-[#121416] text-dark-muted hover:text-slate-200 border-[#26292d]'
                ]"
                title="Информация / Понятно"
              >
                <span>😐</span>
                <span class="font-mono">{{ comment.reactions.neutral || 0 }}</span>
              </button>

              <!-- Bad (👎) -->
              <button 
                @click="handleReaction(comment.id, 'bad')"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border',
                  comment.userReaction === 'bad' 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-950/50' 
                    : 'bg-[#0c0d0e] hover:bg-[#121416] text-dark-muted hover:text-slate-200 border-[#26292d]'
                ]"
                title="Не работает / Не согласен"
              >
                <span>👎</span>
                <span class="font-mono">{{ comment.reactions.bad || 0 }}</span>
              </button>
            </div>

            <!-- Reply Button -->
            <button 
              @click="replyingToId = replyingToId === comment.id ? null : comment.id"
              class="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold transition-all px-2.5 py-1 rounded-lg hover:bg-cyan-500/10"
            >
              <IconRenderer name="CornerDownRight" size="14" />
              <span>Ответить</span>
            </button>
          </div>
        </div>

        <!-- Inline Reply Input Box -->
        <div v-if="replyingToId === comment.id" class="ml-4 sm:ml-10 p-4 rounded-xl border border-cyan-500/40 bg-[#121417] shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div class="flex items-center gap-2 mb-2">
            <IconRenderer name="CornerDownRight" size="14" class="text-cyan-400" />
            <span class="text-xs font-bold text-cyan-300">Ответ пользователю @{{ comment.author }}</span>
          </div>
          <textarea 
            v-model="replyText"
            :maxlength="MAX_CHAR_LIMIT"
            placeholder="Напишите ответ..."
            rows="2"
            class="w-full p-3 text-xs sm:text-sm rounded-lg bg-[#0c0d0e] border border-[#26292d] text-white placeholder-dark-muted focus:outline-none focus:border-cyan-500/60 transition-all resize-y mb-3"
          ></textarea>
          <div class="flex items-center justify-between">
            <span :class="['text-[11px] font-mono transition-colors', replyText.length >= MAX_CHAR_LIMIT ? 'text-rose-400 font-bold' : 'text-dark-muted']">
              {{ replyText.length }} / {{ MAX_CHAR_LIMIT }} символов
            </span>
            <div class="flex items-center gap-2">
              <button 
                @click="replyingToId = null" 
                class="px-3 py-1.5 text-xs font-medium text-dark-muted hover:text-white transition-all"
              >
                Отмена
              </button>
              <button 
                @click="handlePostComment(comment.id)"
                :disabled="!replyText.trim() || replyText.length > MAX_CHAR_LIMIT || isSubmitting"
                class="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all disabled:opacity-40"
              >
                <IconRenderer name="Send" size="12" />
                <span>Отправить ответ</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Nested Replies Thread -->
        <div v-if="getReplies(comment.id).length > 0" class="ml-4 sm:ml-10 pl-3 sm:pl-4 border-l-2 border-cyan-500/30 space-y-3 mt-1">
          <div 
            v-for="reply in getReplies(comment.id)" 
            :key="reply.id" 
            class="p-3.5 sm:p-4 rounded-xl border border-[#26292d] bg-[#121416] shadow-sm hover:border-[#32363e] transition-all"
          >
            <!-- Reply Header -->
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2 flex-wrap">
                <!-- Avatar -->
                <img 
                  v-if="reply.authorAvatar" 
                  :src="reply.authorAvatar" 
                  class="w-6 h-6 rounded-lg object-cover border border-[#26292d]" 
                />
                <div v-else class="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center text-white text-[10px] font-bold">
                  {{ reply.author.charAt(0).toUpperCase() }}
                </div>

                <span class="text-xs font-bold text-white">{{ reply.author }}</span>

                <span 
                  v-if="reply.author.toLowerCase() === guideAuthor.toLowerCase()"
                  class="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                >
                  Автор гайда
                </span>

                <span class="text-[10px] text-dark-muted font-mono ml-auto sm:ml-0">{{ formatDate(reply.createdAt) }}</span>
              </div>

              <button 
                v-if="canDelete(reply)" 
                @click="handleDeleteComment(reply.id)"
                title="Удалить ответ"
                class="p-1 text-rose-400/70 hover:text-rose-400"
              >
                <IconRenderer name="Trash2" size="13" />
              </button>
            </div>

            <!-- Reply Content -->
            <p class="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed mb-3">
              {{ reply.content }}
            </p>

            <!-- Reply Reactions -->
            <div class="flex items-center gap-1.5 pt-2 border-t border-[#26292d]/50 text-[11px]">
              <button 
                @click="handleReaction(reply.id, 'good')"
                :class="[
                  'flex items-center gap-1 px-2 py-0.5 rounded transition-all',
                  reply.userReaction === 'good' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-dark-muted hover:text-slate-200'
                ]"
              >
                👍 <span class="font-mono text-[10px]">{{ reply.reactions.good || 0 }}</span>
              </button>

              <button 
                @click="handleReaction(reply.id, 'neutral')"
                :class="[
                  'flex items-center gap-1 px-2 py-0.5 rounded transition-all',
                  reply.userReaction === 'neutral' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-dark-muted hover:text-slate-200'
                ]"
              >
                😐 <span class="font-mono text-[10px]">{{ reply.reactions.neutral || 0 }}</span>
              </button>

              <button 
                @click="handleReaction(reply.id, 'bad')"
                :class="[
                  'flex items-center gap-1 px-2 py-0.5 rounded transition-all',
                  reply.userReaction === 'bad' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-dark-muted hover:text-slate-200'
                ]"
              >
                👎 <span class="font-mono text-[10px]">{{ reply.reactions.bad || 0 }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
