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

// Group comments into root items and reply children
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
</script>

<template>
  <div class="mt-12 pt-8 border-t border-[var(--border-color)]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
        <IconRenderer icon="MessageSquare" class="w-5 h-5 text-[var(--accent-color, #1c7ed6)]" />
        Комментарии 
        <span class="text-sm font-medium px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
          {{ comments.length }}
        </span>
      </h3>
    </div>

    <!-- Main Comment Input Box -->
    <div class="mb-8 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
      <div v-if="currentUsername" class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow">
            {{ currentUsername.charAt(0).toUpperCase() }}
          </div>
          <span class="text-sm font-semibold text-[var(--text-primary)]">{{ currentUsername }}</span>
        </div>
        <textarea 
          v-model="newCommentText"
          placeholder="Напишите ваш комментарий или вопрос по гайду..."
          rows="3"
          class="w-full p-3 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-color, #1c7ed6)] transition resize-y"
        ></textarea>
        <div class="flex justify-end">
          <button 
            @click="handlePostComment(null)"
            :disabled="!newCommentText.trim() || isSubmitting"
            class="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-[var(--accent-color, #1c7ed6)] hover:brightness-110 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <IconRenderer icon="Send" class="w-3.5 h-3.5" />
            Отправить
          </button>
        </div>
      </div>

      <div v-else class="text-center py-4">
        <p class="text-sm text-[var(--text-secondary)] mb-3">Авторизуйтесь через ваш аккаунт Cubix, чтобы оставить комментарий</p>
        <button 
          @click="emit('require-auth')"
          class="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--accent-color, #1c7ed6)] text-white hover:brightness-110 transition shadow"
        >
          Войти в аккаунт
        </button>
      </div>
    </div>

    <!-- Comments Tree -->
    <div v-if="isLoading" class="text-center py-8 text-[var(--text-secondary)] text-sm animate-pulse">
      Загрузка комментариев...
    </div>

    <div v-else-if="rootComments.length === 0" class="text-center py-8 text-[var(--text-secondary)] text-sm">
      Комментариев пока нет. Будьте первым, кто оставит отзыв!
    </div>

    <div v-else class="space-y-6">
      <div v-for="comment in rootComments" :key="comment.id" class="flex flex-col gap-2">
        <!-- Single Comment Card -->
        <div class="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs transition hover:border-[var(--border-color)]">
          <!-- Author Info & Badges -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Avatar -->
              <img 
                v-if="comment.authorAvatar" 
                :src="comment.authorAvatar" 
                class="w-7 h-7 rounded-full object-cover border border-[var(--border-color)]" 
              />
              <div v-else class="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
                {{ comment.author.charAt(0).toUpperCase() }}
              </div>

              <!-- Name -->
              <span class="text-sm font-semibold text-[var(--text-primary)]">{{ comment.author }}</span>

              <!-- Badges -->
              <span 
                v-if="comment.author.toLowerCase() === guideAuthor.toLowerCase()"
                class="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              >
                Автор гайда
              </span>
              <span 
                v-else-if="comment.authorRole === 'dark_core_team' || comment.authorRole === 'admin'"
                class="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30"
              >
                DarkCore Team
              </span>
              <span 
                v-else-if="comment.authorRole === 'moderator'"
                class="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30"
              >
                Модератор
              </span>

              <span class="text-xs text-[var(--text-secondary)] ml-auto sm:ml-0">{{ formatDate(comment.createdAt) }}</span>
            </div>

            <!-- Delete Button -->
            <button 
              v-if="canDelete(comment)" 
              @click="handleDeleteComment(comment.id)"
              title="Удалить комментарий"
              class="p-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition"
            >
              <IconRenderer icon="Trash" class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Content -->
          <p class="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed mb-3 pl-9">
            {{ comment.content }}
          </p>

          <!-- Footer Actions & 3-Tier Reactions -->
          <div class="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]/60 text-xs pl-9">
            <!-- 3-Tier Reactions -->
            <div class="flex items-center gap-1.5">
              <!-- Good (👍) -->
              <button 
                @click="handleReaction(comment.id, 'good')"
                :class="[
                  'flex items-center gap-1 px-2 py-1 rounded-md transition font-medium',
                  comment.userReaction === 'good' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                ]"
              >
                <span>👍</span>
                <span>{{ comment.reactions.good || 0 }}</span>
              </button>

              <!-- Neutral (😐) -->
              <button 
                @click="handleReaction(comment.id, 'neutral')"
                :class="[
                  'flex items-center gap-1 px-2 py-1 rounded-md transition font-medium',
                  comment.userReaction === 'neutral' 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
                    : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                ]"
              >
                <span>😐</span>
                <span>{{ comment.reactions.neutral || 0 }}</span>
              </button>

              <!-- Bad (👎) -->
              <button 
                @click="handleReaction(comment.id, 'bad')"
                :class="[
                  'flex items-center gap-1 px-2 py-1 rounded-md transition font-medium',
                  comment.userReaction === 'bad' 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                    : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                ]"
              >
                <span>👎</span>
                <span>{{ comment.reactions.bad || 0 }}</span>
              </button>
            </div>

            <!-- Reply Trigger -->
            <button 
              @click="replyingToId = replyingToId === comment.id ? null : comment.id"
              class="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition"
            >
              <IconRenderer icon="CornerDownRight" class="w-3.5 h-3.5" />
              Ответить
            </button>
          </div>
        </div>

        <!-- Nested Reply Input Box -->
        <div v-if="replyingToId === comment.id" class="ml-8 mt-2 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]">
          <textarea 
            v-model="replyText"
            :placeholder="`Ответ пользователю @${comment.author}...`"
            rows="2"
            class="w-full p-2 text-xs rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none transition resize-y mb-2"
          ></textarea>
          <div class="flex justify-end gap-2">
            <button 
              @click="replyingToId = null" 
              class="px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Отмена
            </button>
            <button 
              @click="handlePostComment(comment.id)"
              :disabled="!replyText.trim() || isSubmitting"
              class="px-3 py-1 text-xs font-bold rounded bg-[var(--accent-color, #1c7ed6)] text-white hover:brightness-110 disabled:opacity-40"
            >
              Ответить
            </button>
          </div>
        </div>

        <!-- Nested Replies List -->
        <div v-if="getReplies(comment.id).length > 0" class="ml-6 sm:ml-8 pl-3 border-l-2 border-[var(--border-color)] space-y-3 mt-1">
          <div v-for="reply in getReplies(comment.id)" :key="reply.id" class="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-semibold text-[var(--text-primary)]">{{ reply.author }}</span>

                <span 
                  v-if="reply.author.toLowerCase() === guideAuthor.toLowerCase()"
                  class="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                >
                  Автор гайда
                </span>

                <span class="text-[11px] text-[var(--text-secondary)] ml-auto sm:ml-0">{{ formatDate(reply.createdAt) }}</span>
              </div>

              <button 
                v-if="canDelete(reply)" 
                @click="handleDeleteComment(reply.id)"
                title="Удалить ответ"
                class="p-1 text-xs text-rose-400 hover:text-rose-300"
              >
                <IconRenderer icon="Trash" class="w-3 h-3" />
              </button>
            </div>

            <p class="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed mb-2">
              {{ reply.content }}
            </p>

            <!-- Reply Reactions -->
            <div class="flex items-center gap-1.5 pt-1.5 border-t border-[var(--border-color)]/40 text-[11px]">
              <button 
                @click="handleReaction(reply.id, 'good')"
                :class="[
                  'flex items-center gap-1 px-1.5 py-0.5 rounded transition',
                  reply.userReaction === 'good' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                ]"
              >
                👍 {{ reply.reactions.good || 0 }}
              </button>
              <button 
                @click="handleReaction(reply.id, 'neutral')"
                :class="[
                  'flex items-center gap-1 px-1.5 py-0.5 rounded transition',
                  reply.userReaction === 'neutral' ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                ]"
              >
                😐 {{ reply.reactions.neutral || 0 }}
              </button>
              <button 
                @click="handleReaction(reply.id, 'bad')"
                :class="[
                  'flex items-center gap-1 px-1.5 py-0.5 rounded transition',
                  reply.userReaction === 'bad' ? 'bg-rose-500/20 text-rose-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                ]"
              >
                👎 {{ reply.reactions.bad || 0 }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
