"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { 
  Lightbulb, 
  Plus, 
  Flame, 
  MessageCircle,
  Search,
  Bell,
  User
} from "lucide-react";

interface CreativityCardProps {
  id: string;
  user: {
    avatar: string;
    nickname: string;
    timestamp: string;
  };
  title: string;
  description: string;
  platforms: string[];
  stats: {
    votes: string;
    comments: string;
  };
}

const CreativityCard = ({ card }: { card: CreativityCardProps }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={card.user.avatar} alt={card.user.nickname} />
              <AvatarFallback>{card.user.nickname.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{card.user.nickname}</p>
              <p className="text-sm text-gray-500">{card.user.timestamp}</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pb-4">
          <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-[#2ECC71] transition-colors">
            {card.title}
          </h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {card.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {card.platforms.map((platform, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {platform}
              </Badge>
            ))}
          </div>
        </CardContent>
        
        <CardFooter className="pt-0">
          <div className="flex items-center justify-between w-full">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-[#2ECC71] text-white border-[#2ECC71] hover:bg-[#27AE60] hover:border-[#27AE60]"
            >
              <Flame className="h-4 w-4 mr-1" />
              我想要 ({card.stats.votes})
            </Button>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <span>{card.stats.comments}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const IdeaToGoldApp = () => {
  const [activeTab, setActiveTab] = React.useState("热门");
  const [isLoaded, setIsLoaded] = React.useState(false);

  const navigationItems = [
    { name: "创意广场", active: true },
    { name: "项目", active: false },
    { name: "产品", active: false }
  ];

  const filterTabs = ["热门", "最新"];

  const creativityCards: CreativityCardProps[] = [
    {
      id: "1",
      user: {
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
        nickname: "张设计师",
        timestamp: "2小时前"
      },
      title: "智能家居控制系统UI设计",
      description: "基于物联网技术的智能家居控制界面设计，包含灯光、温度、安防等模块的交互设计方案。采用现代简约风格，注重用户体验。",
      platforms: ["网页", "小程序", "iOS"],
      stats: {
        votes: "1.2k",
        comments: "88",

      }
    },
    {
      id: "2",
      user: {
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
        nickname: "李产品",
        timestamp: "4小时前"
      },
      title: "在线教育平台交互优化",
      description: "针对K12在线教育平台的用户体验优化方案，包括课程播放、作业提交、师生互动等核心功能的界面重设计。",
      platforms: ["网页", "Android"],
      stats: {
        votes: "856",
        comments: "42",

      }
    },
    {
      id: "3",
      user: {
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
        nickname: "王开发",
        timestamp: "6小时前"
      },
      title: "区块链钱包应用设计",
      description: "去中心化数字钱包应用的完整设计方案，包含资产管理、交易记录、DeFi功能等模块，注重安全性和易用性平衡。",
      platforms: ["iOS", "Android"],
      stats: {
        votes: "2.1k",
        comments: "156",

      }
    },
    {
      id: "4",
      user: {
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
        nickname: "陈UI",
        timestamp: "8小时前"
      },
      title: "医疗健康管理系统",
      description: "面向医院和患者的健康管理平台设计，包含预约挂号、病历管理、健康监测等功能，符合医疗行业规范。",
      platforms: ["网页", "小程序"],
      stats: {
        votes: "743",
        comments: "67",

      }
    },
    {
      id: "5",
      user: {
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
        nickname: "刘创意",
        timestamp: "10小时前"
      },
      title: "社交电商平台设计",
      description: "结合社交和电商的创新平台设计，通过社区分享、直播带货、拼团购买等功能，打造新型购物体验。",
      platforms: ["小程序", "iOS", "Android"],
      stats: {
        votes: "1.8k",
        comments: "203",

      }
    },
    {
      id: "6",
      user: {
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
        nickname: "周视觉",
        timestamp: "12小时前"
      },
      title: "AR购物体验应用",
      description: "基于增强现实技术的购物应用设计，用户可以通过AR试穿试用商品，提供沉浸式购物体验和精准的商品展示。",
      platforms: ["iOS", "Android"],
      stats: {
        votes: "967",
        comments: "91",

      }
    }
  ];

  React.useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header Navigation */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white border-b border-gray-200 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-[#2ECC71] to-[#27AE60] rounded-lg flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>

              </div>
              <h1 className="text-xl font-bold text-gray-900">点子成金</h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <a
                  key={item.name}
                  href="#"
                  className={cn(
                    "text-sm font-medium transition-colors",
                    item.active 
                      ? "text-[#2ECC71] border-b-2 border-[#2ECC71] pb-1" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {item.name}
                </a>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center space-x-4">
              <Button className="bg-[#2ECC71] hover:bg-[#27AE60] text-white">
                <Plus className="h-4 w-4 mr-2" />
                发布创意
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-2">创意广场</h2>
          <p className="text-gray-600">发现优秀创意，连接创作者与需求方</p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all",
                  activeTab === tab
                    ? "bg-[#2ECC71] text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Creativity Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creativityCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isLoaded ? { opacity: 1, y: 0 } : {}}
              transition={{ 
                duration: 0.6, 
                delay: 0.4 + index * 0.1,
                ease: "easeOut"
              }}
            >
              <CreativityCard card={card} />
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default IdeaToGoldApp;
