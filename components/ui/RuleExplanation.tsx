import React from 'react';

interface RuleExplanationProps {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
}

const RuleExplanation: React.FC<RuleExplanationProps> = ({ isOpen, title, description, onClose }) => {
  if (!isOpen) return null;

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // 只在点击背景时关闭，不在内容框上关闭
    if (e.currentTarget === e.target) {
      onClose();
    }
  };

  // 解析描述文本，将其分为段落和列表项
  const renderDescription = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 检查是否是列表项（以数字或大写字母开头，冒号结尾）
      const isListItem = /^[A-Z0-9\s]+:/.test(trimmedLine);
      
      if (trimmedLine === '') {
        // 空行：输出当前段落
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="text-gray-300 text-sm leading-relaxed">
              {currentParagraph.join(' ')}
            </p>
          );
          currentParagraph = [];
        }
      } else if (isListItem) {
        // 输出当前段落
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${index}`} className="text-gray-300 text-sm leading-relaxed">
              {currentParagraph.join(' ')}
            </p>
          );
          currentParagraph = [];
        }
        // 添加列表项
        elements.push(
          <div key={`li-${index}`} className="text-gray-300 text-sm leading-relaxed pl-4 flex items-start gap-3">
            <span className="text-green-400 mt-0.5">•</span>
            <span>{trimmedLine}</span>
          </div>
        );
      } else {
        // 普通文本行
        currentParagraph.push(trimmedLine);
      }
    });

    // 添加最后的段落
    if (currentParagraph.length > 0) {
      elements.push(
        <p key={`p-final`} className="text-gray-300 text-sm leading-relaxed">
          {currentParagraph.join(' ')}
        </p>
      );
    }

    return elements;
  };

  return (
    <div 
      onClick={handleBackgroundClick}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-xl font-bold text-green-400 mb-4">{title}</h3>
        <div className="space-y-3">
          {renderDescription(description)}
        </div>
      </div>
    </div>
  );
};

export default RuleExplanation;
