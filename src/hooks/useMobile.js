import { useState, useEffect } from 'react';

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [orientation, setOrientation] = useState('portrait');

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setOrientation(width > window.innerHeight ? 'landscape' : 'portrait');
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    orientation,
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
  };
}

export function useTouch() {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    return { isLeftSwipe, isRightSwipe, distance };
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    touchStart,
    touchEnd,
  };
}

export function useCamera() {
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraPermission, setCameraPermission] = useState('prompt');

  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasCamera(videoDevices.length > 0);

        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: 'camera' });
          setCameraPermission(permission.state);
        }
      } catch (error) {
        console.error('检查相机失败:', error);
        setHasCamera(false);
      }
    };

    checkCamera();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      return true;
    } catch (error) {
      console.error('请求相机权限失败:', error);
      setCameraPermission('denied');
      return false;
    }
  };

  return {
    hasCamera,
    cameraPermission,
    requestCameraPermission,
  };
}

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const checkBiometric = async () => {
      if (window.PublicKeyCredential) {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsAvailable(available);
      }
    };

    checkBiometric();
  }, []);

  const authenticate = async () => {
    try {
      // 实现生物识别认证
      // 这需要 Tauri 插件支持
      return true;
    } catch (error) {
      console.error('生物识别认证失败:', error);
      return false;
    }
  };

  return {
    isAvailable,
    authenticate,
  };
}




