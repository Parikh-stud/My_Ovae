
'use client';

import { m } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, Settings, Send, Frown, Loader2, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { moderateContent } from '@/ai/flows/community-content-moderation';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';

const forumCategories = [
  {
    id: 'newly_concerned',
    title: 'Newly Concerned',
    icon: '🌱',
    description: 'Just starting your PCOS journey.',
    activeCount: 24,
    color: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  },
  {
    id: 'seeking_diagnosis',
    title: 'Seeking Diagnosis',
    icon: '🔍',
    description: 'Navigating the diagnosis process.',
    activeCount: 18,
    color: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
  },
  {
    id: 'general_support',
    title: 'General Support',
    icon: '💜',
    description: 'Daily support and encouragement.',
    activeCount: 156,
    color: 'bg-primary/20 text-primary border-primary/30',
  },
  {
    id: 'success_stories',
    title: 'Success Stories',
    icon: '⭐',
    description: 'Share your wins and progress.',
    activeCount: 42,
    color: 'bg-secondary/20 text-secondary border-secondary/30',
  },
];

const FloatingAvatar = ({ member, index }: { member: any, index: number }) => {
    const [initialPosition, setInitialPosition] = useState<{x: number, y: number} | null>(null);
    const [animatePosition, setAnimatePosition] = useState<{x: string[], y: string[]}>({ x: [], y: [] });
    const avatarPlaceholder = PlaceHolderImages.find(img => img.id === 'avatar1');


    useEffect(() => {
        const startPos = {
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
        };
        setInitialPosition(startPos);
        setAnimatePosition({
            x: [`${startPos.x}%`, `${Math.random() * 80 + 10}%`, `${startPos.x}%`],
            y: [`${startPos.y}%`, `${Math.random() * 80 + 10}%`, `${startPos.y}%`],
        });
    }, []);


    const animationDuration = 15 + index * 2;
    
    if (!initialPosition) {
        return null; // Don't render until client-side mount
    }
    
    return (
        <m.div
            className="absolute group"
            initial={{ x: `${initialPosition.x}%`, y: `${initialPosition.y}%`, scale: 0 }}
            animate={{ 
                x: animatePosition.x,
                y: animatePosition.y,
                scale: 1 
            }}
            transition={{ 
                duration: animationDuration, 
                repeat: Infinity, 
                ease: 'easeInOut',
                delay: index * 0.2
            }}
        >
            <Avatar className="h-16 w-16 border-4 border-primary/50 transition-all duration-300 group-hover:scale-110 cursor-pointer">
                <AvatarImage src={member.photoURL || avatarPlaceholder?.imageUrl} data-ai-hint={avatarPlaceholder?.imageHint || "woman portrait"} />
                <AvatarFallback>{member.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <p className="text-center text-xs mt-1 text-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity">{member.displayName}</p>
        </m.div>
    );
};

const CreatePost = ({ onPostCreated }: { onPostCreated: () => void }) => {
    const [postContent, setPostContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const handlePostSubmit = async () => {
        if (!postContent.trim() || !user || !firestore || isSubmitting) return;
        
        setIsSubmitting(true);
        try {
            const moderationResult = await moderateContent({ text: postContent });
            
            if (moderationResult.isSafe) {
                const postsRef = collection(firestore, 'communityPosts');
                addDocumentNonBlocking(postsRef, {
                    userId: user.uid,
                    content: postContent,
                    category: 'General Support',
                    title: postContent.substring(0, 30),
                    createdAt: new Date(),
                });
                
                toast({
                    title: "Post Submitted!",
                    description: "Your post is now live in the community.",
                });
                setPostContent('');
                onPostCreated();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Content Moderated',
                    description: `Your post was flagged for: ${moderationResult.reason}. Please revise and resubmit.`,
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not submit your post. Please try again later.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
         <Card className="glass-card">
            <CardHeader>
                <CardTitle>Share with the Sisterhood</CardTitle>
            </CardHeader>
            <CardContent>
                <Textarea
                    placeholder="What's on your mind? Ask a question, share a win, or find support..."
                    className="h-32 bg-background/50"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    disabled={isSubmitting}
                />
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handlePostSubmit} disabled={!postContent.trim() || isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                    Post
                </Button>
            </CardFooter>
        </Card>
    );
}

const PostItem = ({ post }: { post: any }) => {
    const firestore = useFirestore();
    const authorRef = useMemoFirebase(() => {
        if (!firestore || !post.userId) return null;
        return doc(firestore, 'publicUserProfiles', post.userId);
    }, [firestore, post.userId]);

    const { data: author, isLoading, error } = useDoc(authorRef);
    
    if (isLoading) return <div className="flex items-center gap-4 p-4"><div className="h-10 w-10 rounded-full bg-muted"/><div className="flex-1 space-y-2"><div className="h-4 w-1/4 bg-muted rounded"/><div className="h-4 w-3/4 bg-muted rounded"/></div></div>;

    const avatarPlaceholder = PlaceHolderImages.find(img => img.id === 'avatar1');

    return (
         <m.div 
            className="flex items-start gap-4 p-4 rounded-lg bg-black/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Avatar>
                <AvatarImage src={author?.photoURL || avatarPlaceholder?.imageUrl} data-ai-hint={avatarPlaceholder?.imageHint || "woman portrait"} />
                <AvatarFallback>{author?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-baseline gap-2">
                    <p className="font-semibold">{author?.displayName || 'Community Member'}</p>
                    <Badge variant="outline">{post.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{post.content}</p>
                 {error && <p className="text-xs text-destructive mt-1">Could not load author details.</p>}
            </div>
        </m.div>
    )
}

export default function CommunityPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [postCount, setPostCount] = useState(10);

    const postsQuery = useMemoFirebase(() => {
        if (!firestore || isUserLoading || !user) return null;
        return query(collection(firestore, 'communityPosts'), orderBy('createdAt', 'desc'), limit(postCount));
    }, [firestore, user, isUserLoading, postCount]);
    const { data: communityPosts, isLoading: isLoadingPosts, error: postsError } = useCollection(postsQuery);

    const communityMembersQuery = useMemoFirebase(() => {
        if (!firestore || isUserLoading || !user) return null;
        return query(collection(firestore, 'publicUserProfiles'), limit(6));
    }, [firestore, user, isUserLoading]);
    const { data: communityMembers, isLoading: isLoadingMembers } = useCollection(communityMembersQuery);

    const onPostCreated = useCallback(() => {
        // This will trigger a re-fetch of posts because the underlying data has changed.
        // If immediate feedback is needed and you don't want to wait for the listener,
        // you might manually refetch or update the local state.
        // For simplicity, we'll rely on the real-time listener.
    }, []);

    return (
        <div className="p-4 md:p-8 space-y-8">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Users className="size-8 text-secondary" />
                    <h1 className="text-3xl font-headline font-bold text-gradient">The Sisterhood</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                        <Settings className="size-5" />
                    </Button>
                </div>
            </header>

            <Card className="glass-card min-h-[400px]">
                <CardHeader>
                    <CardTitle>Community Space</CardTitle>
                </CardHeader>
                <CardContent className="relative h-96">
                    <div className="absolute inset-0 bg-grid-slate-700/[0.05] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom_1px_center" style={{ maskImage: 'linear-gradient(to bottom, transparent, black, black, transparent)'}} />
                    {isLoadingMembers ? (
                        <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-primary" /></div>
                    ) : (
                        communityMembers && communityMembers.map((member, index) => (
                            <FloatingAvatar key={member.id} member={member} index={index} />
                        ))
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <CreatePost onPostCreated={onPostCreated} />
                     <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Recent Posts</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {isLoadingPosts && <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>}
                           {postsError && <div className="flex flex-col items-center justify-center p-8 text-destructive"><ServerCrash className="mb-2" /><span>Could not load posts.</span></div>}
                           {!isLoadingPosts && communityPosts && communityPosts.length === 0 && <div className="flex flex-col items-center justify-center p-8 text-muted-foreground"><Frown className="mb-2" /><span>No posts yet. Be the first to share!</span></div>}
                           {!isLoadingPosts && communityPosts && communityPosts.map(post => <PostItem key={post.id} post={post} />)}
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-8">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Forums</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {forumCategories.map((category) => (
                                <div key={category.id} className={cn("p-3 rounded-lg border flex items-center gap-4 cursor-pointer hover:bg-accent", category.color)}>
                                    <span className="text-2xl">{category.icon}</span>
                                    <div>
                                        <p className="font-bold">{category.title}</p>
                                        <Badge variant="outline">{category.activeCount} active</Badge>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
